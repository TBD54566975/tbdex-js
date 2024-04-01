import type { MessageKind, MessageModel, PayinMethod, RfqData, RfqMetadata, RfqPrivateData, CreateRfqData } from '../types.js'

import { BigNumber } from 'bignumber.js'
import { Crypto } from '../crypto.js'
import { Offering } from '../resource-kinds/index.js'
import { VerifiableCredential, PresentationExchange } from '@web5/credentials'
import { Message } from '../message.js'
import Ajv from 'ajv'
import { Parser } from '../parser.js'
import { validate } from '../validator.js'
import { Convert } from '@web5/common'
import { randomBytes } from '@web5/crypto/utils'

/**
 * Options passed to {@link Rfq.create}
 * @beta
 */
export type CreateRfqOptions = {
  data: CreateRfqData
  metadata: Omit<RfqMetadata, 'id' | 'kind' | 'createdAt' | 'exchangeId' | 'protocol'> & { protocol?: RfqMetadata['protocol'] }
}

/**
 * Options passed to {@link Rfq.parse}
 * @beta
 */
export type ParseRfqOptions = {
  /**
   * If true, validate that all private data properties are present and run integrity check.
   * Otherwise, only check integrity of private fields which are present.
   * If false, validate only the private data properties that are currently present in `privateData`
   */
  requireAllPrivateData: boolean
}

/**
 * Message sent by Alice to PFI to request a quote (RFQ)
 * @beta
 */
export class Rfq extends Message {
  /** a set of valid Message kinds that can come after an rfq */
  readonly validNext = new Set<MessageKind>(['quote', 'close'])
  /** The message kind (rfq) */
  readonly kind = 'rfq'

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: RfqMetadata
  /** Rfq's data containing information to initiate an exchange between Alice and a PFI */
  readonly data: RfqData
  /** Rfq's unhashed private information to initiate an exchange between Alice and a PFI */
  readonly privateData: RfqPrivateData | undefined

  constructor(metadata: RfqMetadata, data: RfqData, signature?: string, privateData?: RfqPrivateData) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
    this.privateData = privateData
  }

  /**
   * Parses a json message into an Rfq
   * @param rawMessage - the rfq to parse
   * @throws if the rfq could not be parsed or is not a valid Rfq
   * @returns The parsed Rfq
   */
  static async parse(rawMessage: MessageModel | string, opts?: ParseRfqOptions): Promise<Rfq> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const rfq = new Rfq(
      jsonMessage.metadata as RfqMetadata,
      jsonMessage.data as RfqData,
      jsonMessage.signature,
      jsonMessage.privateData
    )

    await rfq.verify()

    if (opts?.requireAllPrivateData) {
      rfq.verifyAllPrivateData()
    } else {
      rfq.verifyPresentPrivateData()
    }

    return rfq
  }

  /**
   * Valid structure of the message including the presence of the signature
   * using the official spec JSON Schemas
   * @override
   * @throws If the message's structure does not match the JSON schemas
   */
  validate(): void {
    super.validate()
    if (this.privateData !== undefined) {
      validate(this.privateData, 'rfqPrivate')
    }
  }

  /**
   * Creates an rfq with the given options
   * @param opts - options to create an rfq
   * @returns {@link Rfq}
   */
  static create(opts: CreateRfqOptions): Rfq {
    const id = Message.generateId('rfq')
    const metadata: RfqMetadata = {
      ...opts.metadata,
      kind       : 'rfq',
      id         : id,
      exchangeId : id,
      createdAt  : new Date().toISOString(),
      protocol   : opts.metadata.protocol ?? '1.0'
    }

    const { data, privateData } = Rfq.hashPrivateData(opts.data)

    const rfq = new Rfq(metadata, data, undefined, privateData)
    rfq.validateData()

    return rfq
  }

  /**
   * Hash private RFQ data and set private fields in an RfqPrivateData object
   * @param - unhashedRfqData
   * @returns An object with fields data and privateData.
   * @returns {@link RfqData} The value of data field.
   * @returns {@link RfqPrivateData} The value of privateData field.
   */
  private static hashPrivateData(unhashedRfqData: CreateRfqData): { data: RfqData, privateData: RfqPrivateData } {
    const salt = Convert.uint8Array(randomBytes(16)).toBase64Url()

    const {
      claims,
      payin,
      payout,
      ...remainingRfqData
    } = unhashedRfqData
    const { paymentDetails: payinDetails, ...remainingPayin } = payin
    const { paymentDetails: payoutDetails, ...remainingPayout } = payout

    const data: RfqData = {
      ...remainingRfqData,
      payin  : remainingPayin,
      payout : remainingPayout,
    }
    if (payinDetails !== undefined) {
      data.payin!.paymentDetailsHash = Rfq.digestPrivateData(salt, payinDetails)
    }
    if (payoutDetails !== undefined) {
      data.payout!.paymentDetailsHash = Rfq.digestPrivateData(salt, payoutDetails)
    }
    if (claims !== undefined && claims?.length > 0) {
      data.claimsHash = Rfq.digestPrivateData(salt, claims)
    }

    const privateData: RfqPrivateData = {
      salt,
      payin: {
        paymentDetails: payinDetails,
      },
      payout: {
        paymentDetails: payoutDetails,
      },
      claims: claims
    }

    return {
      data,
      privateData,
    }
  }

  /**
   * Verify the presence and integrity of all possible properties in {@link Rfq.privateData}.
   * @throws if there are properties missing in {@link Rfq.privateData} or which do not match the corresponding
   *         hashed property in {@link Rfq.data}
   */
  private verifyAllPrivateData(): void {
    if (this.privateData === undefined) {
      throw new Error('Could not verify all privateData because privateData property is missing')
    }

    // Verify payin details
    if (this.data.payin.paymentDetailsHash !== undefined) {
      this.verifyPayinDetailsHash()
    }

    // Verify payout details
    if (this.data.payout.paymentDetailsHash !== undefined) {
      this.verifyPayoutDetailsHash()
    }

    // Verify claims
    if (this.data.claimsHash !== undefined) {
      this.verifyClaimsHash()
    }
  }

  /**
   * Verify the integrity properties that are present in {@link Rfq.privateData}.
   * @throws if there are properties present in {@link Rfq.privateData} which do not match the corresponding
   *         hashed property in {@link Rfq.data}
   */
  private verifyPresentPrivateData(): void {
    // Verify payin details
    if (this.data.payin.paymentDetailsHash !== undefined && this.privateData?.payin?.paymentDetails !== undefined) {
      this.verifyPayinDetailsHash()
    }

    // Verify payout details
    if (this.data.payout.paymentDetailsHash !== undefined && this.privateData?.payout?.paymentDetails !== undefined) {
      this.verifyPayoutDetailsHash()
    }

    // Verify claims
    if (this.data.claimsHash !== undefined  && this.privateData?.claims !== undefined) {
      this.verifyClaimsHash()
    }
  }

  private verifyPayinDetailsHash(): void {
    const digest = Rfq.digestPrivateData(this.privateData!.salt, this.privateData?.payin?.paymentDetails)

    if (digest !== this.data.payin.paymentDetailsHash) {
      throw new Error(
        'Private data integrity check failed: ' +
        'data.payin.paymentDetailsHash does not match digest of privateData.payin.paymentDetails'
      )
    }
  }

  private verifyPayoutDetailsHash(): void {
    const digest = Rfq.digestPrivateData(this.privateData!.salt, this.privateData?.payout?.paymentDetails)

    if (digest !== this.data.payout.paymentDetailsHash) {
      throw new Error(
        'Private data integrity check failed: ' +
        'data.payout.paymentDetailsHash does not match digest of privateData.payout.paymentDetails'
      )
    }
  }

  private verifyClaimsHash(): void {
    const claimsHash = this.data.claimsHash!
    const claims = this.privateData?.claims
    const digest = Rfq.digestPrivateData(this.privateData!.salt, claims)

    if (digest !== claimsHash) {
      throw new Error(
        'Private data integrity check failed: ' +
        `data.claimsHash does not match digest of privateData.claims`
      )
    }
  }

  /**
   * Given a salt and a value, compute a deterministic digest used in hashed fields in RfqData
   * @param - salt
   * @param - value
   * @returns salted hash of the private data value
   */
  private static digestPrivateData(salt: string, value: any): string {
    const digestible = [salt, value]
    const byteArray = Crypto.digest(digestible)
    return Convert.uint8Array(byteArray).toBase64Url()
  }

  /**
   * evaluates this rfq against the provided offering
   * @param offering - the offering to evaluate this rfq against
   * @throws if Rfq.data.offeringId doesn't match the provided offering's id
   * @see RfqData#offeringId
   * @throws if payinAmount in {@link Rfq.data} exceeds the provided offering's max units allowed or is below the offering's min units allowed
   * @throws if payinMethod in {@link Rfq.data} property `kind` cannot be validated against the provided offering's payinMethod kinds
   * @throws if payinMethod in {@link Rfq.data} property `paymentDetails` cannot be validated against the provided offering's payinMethod requiredPaymentDetails
   * @throws if payoutMethod in {@link Rfq.data} property `kind` cannot be validated against the provided offering's payoutMethod kinds
   * @throws if payoutMethod in {@link Rfq.data} property `paymentDetails` cannot be validated against the provided offering's payoutMethod requiredPaymentDetails
   */
  async verifyOfferingRequirements(offering: Offering) {
    if (offering.metadata.protocol !== this.metadata.protocol) {
      throw new Error(`protocol version mismatch. (rfq) ${this.metadata.protocol} !== ${offering.metadata.protocol} (offering)`)
    }

    if (offering.metadata.id !== this.data.offeringId) {
      throw new Error(`offering id mismatch. (rfq) ${this.data.offeringId} !== ${offering.metadata.id} (offering)`)
    }

    // Verifying payin amount is less than maximum
    let payinAmount: BigNumber
    if (offering.data.payin.max) {
      payinAmount = BigNumber(this.data.payin.amount)
      const maxAmount = BigNumber(offering.data.payin.max)

      if (payinAmount.isGreaterThan(maxAmount)) {
        throw new Error(`rfq payinAmount exceeds offering's maxAmount. (rfq) ${this.data.payin.amount} > ${offering.data.payin.max} (offering)`)
      }
    }

    // Verify payin amount is more than minimum
    if (offering.data.payin.min) {
      payinAmount ??= BigNumber(this.data.payin.amount)
      const minAmount = BigNumber(offering.data.payin.min)

      if (payinAmount.isLessThan(minAmount)) {
        throw new Error(`rfq payinAmount is below offering's minAmount. (rfq) ${this.data.payin.amount} > ${offering.data.payin.min} (offering)`)
      }
    }

    // Verify payin/payout methods
    this.verifyPaymentMethod(
      this.data.payin.kind,
      this.data.payin.paymentDetailsHash,
      this.privateData?.payin?.paymentDetails,
      offering.data.payin.methods,
      'payin'
    )
    this.verifyPaymentMethod(
      this.data.payout.kind,
      this.data.payout.paymentDetailsHash,
      this.privateData?.payout?.paymentDetails,
      offering.data.payout.methods,
      'payout'
    )

    await this.verifyClaims(offering)
  }

  /**
   * Validate the Rfq's payin/payout method against an Offering's allow payin/payout methods
   *
   * @param rfqPaymentMethod - The Rfq's selected payin/payout method being validated
   * @param allowedPaymentMethods - The Offering's allowed payin/payout methods
   * @param payDirection - Either 'payin' or 'payout', used to provide more detailed error messages.
   *
   * @throws if rfqPaymentMethod property `kind` cannot be validated against the provided offering's paymentMethod's kinds
   * @throws if {@link Rfq.privateData} property `paymentDetails` is missing but is necessary to validate against the provided offering's paymentMethod's kinds
   * @throws if rfqPaymentMethod property `paymentDetails` cannot be validated against the provided offering's paymentMethod's requiredPaymentDetails
   */
  private verifyPaymentMethod(
    selectedPaymentKind: string | undefined,
    selectedPaymentDetailsHash: string | undefined,
    selectedPaymentDetails: Record<string, any> | undefined,
    allowedPaymentMethods: PayinMethod[],
    payDirection: 'payin' | 'payout'
  ): void {
    const paymentMethodMatches = allowedPaymentMethods.filter(paymentMethod => paymentMethod.kind === selectedPaymentKind)

    if (!paymentMethodMatches.length) {
      const paymentMethodKinds = allowedPaymentMethods.map(paymentMethod => paymentMethod.kind).join(', ')
      throw new Error(
        `offering does not support rfq's ${payDirection}Method kind. (rfq) ${selectedPaymentKind} was not found in: [${paymentMethodKinds}] (offering)`
      )
    }

    const ajv = new Ajv.default()
    const invalidPaymentDetailsErrors = new Set()

    for (const paymentMethodMatch of paymentMethodMatches) {
      if (!paymentMethodMatch.requiredPaymentDetails) {
        // If requiredPaymentDetails is omitted, and paymentDetails is also omitted, we have a match
        if (selectedPaymentDetailsHash === undefined) {
          return
        }

        // paymentDetails is present even though requiredPaymentDetails is omitted. This is unsatisfactory.
        invalidPaymentDetailsErrors.add(new Error('paymentDetails must be omitted when requiredPaymentDetails is omitted'))
      } else {
        // requiredPaymentDetails is present, so Rfq's payment details must match
        const validate = ajv.compile(paymentMethodMatch.requiredPaymentDetails)
        const isValid = validate(selectedPaymentDetails)
        if (isValid) {
          // Selected payment method matches one of the offering's allowed payment methods
          return
        }
        invalidPaymentDetailsErrors.add(validate.errors)
      }
    }

    throw new Error(
      `rfq ${payDirection}Method paymentDetails could not be validated against offering requiredPaymentDetails. ` +
      `Schema validation errors: ${Array.from(invalidPaymentDetailsErrors).join()}`
    )
  }

  /**
   * checks the claims provided in this rfq against an offering's requirements
   * @param offering - the offering to check against
   * @throws if rfq's claims do not fulfill the offering's requirements
   */
  async verifyClaims(offering: Offering): Promise<void> {
    if (!offering.data.requiredClaims) {
      return
    }

    const credentials = PresentationExchange.selectCredentials({ vcJwts: this.privateData?.claims ?? [], presentationDefinition: offering.data.requiredClaims })

    if (credentials.length === 0) {
      throw new Error('claims do not fulfill the offering\'s requirements')
    }

    for (let credential of credentials) {
      await VerifiableCredential.verify({ vcJwt: credential })
    }
  }

  /**
   * Converts this rfq message to a json object
   */
  toJSON() {
    const jsonMessage = super.toJSON()
    if (this.privateData !== undefined) {
      jsonMessage.privateData = this.privateData
    }

    return jsonMessage
  }
}