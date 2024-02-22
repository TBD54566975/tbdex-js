import type { MessageKind, MessageModel, PaymentMethod, RfqData, RfqMetadata, SelectedPaymentMethod } from '../types.js'

import { BigNumber } from 'bignumber.js'
import { Offering } from '../resource-kinds/index.js'
import { VerifiableCredential, PresentationExchange } from '@web5/credentials'
import { Message } from '../message.js'
import Ajv from 'ajv'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link Rfq.create}
 * @beta
 */
export type CreateRfqOptions = {
  data: RfqData
  metadata: Omit<RfqMetadata, 'id' | 'kind' | 'createdAt' | 'exchangeId'>
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

  constructor(metadata: RfqMetadata, data: RfqData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json message into an Rfq
   * @param rawMessage - the rfq to parse
   * @throws if the rfq could not be parsed or is not a valid Rfq
   * @returns The parsed Rfq
   */
  static async parse(rawMessage: MessageModel | string): Promise<Rfq> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const rfq = new Rfq(
      jsonMessage.metadata as RfqMetadata,
      jsonMessage.data as RfqData,
      jsonMessage.signature
    )

    await rfq.verify()
    return rfq
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
      createdAt  : new Date().toISOString()
    }

    // TODO: hash and set private fields

    const data: RfqData = {
      ...opts.data,
    }

    const rfq = new Rfq(metadata, data)
    rfq.validateData()

    return rfq
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
    if (offering.metadata.id !== this.data.offeringId) {
      throw new Error(`offering id mismatch. (rfq) ${this.data.offeringId} !== ${offering.metadata.id} (offering)`)
    }

    // Verifyin payin amount is less than maximum
    let payinAmount: BigNumber
    if (offering.data.payinCurrency.maxAmount) {
      payinAmount = BigNumber(this.data.payinAmount)
      const maxAmount = BigNumber(offering.data.payinCurrency.maxAmount)

      if (payinAmount.isGreaterThan(maxAmount)) {
        throw new Error(`rfq payinAmount exceeds offering's maxAmount. (rfq) ${this.data.payinAmount} > ${offering.data.payinCurrency.maxAmount} (offering)`)
      }
    }

    // Verify payin amount is more than minimum
    if (offering.data.payinCurrency.minAmount) {
      payinAmount ??= BigNumber(this.data.payinAmount)
      const minAmount = BigNumber(offering.data.payinCurrency.minAmount)

      if (payinAmount.isLessThan(minAmount)) {
        throw new Error(`rfq payinAmount is below offering's minAmount. (rfq) ${this.data.payinAmount} > ${offering.data.payinCurrency.minAmount} (offering)`)
      }
    }

    // Verify payin/payout methods
    this.verifyPaymentMethod(this.data.payinMethod, offering.data.payinMethods, 'payin')
    this.verifyPaymentMethod(this.data.payoutMethod, offering.data.payoutMethods, 'payout')

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
   * @throws if rfqPaymentMethod property `paymentDetails` cannot be validated against the provided offering's paymentMethod's requiredPaymentDetails
   */
  private verifyPaymentMethod(
    rfqPaymentMethod: SelectedPaymentMethod,
    allowedPaymentMethods: PaymentMethod[],
    payDirection: 'payin' | 'payout'
  ): void {
    const paymentMethodMatches = allowedPaymentMethods.filter(paymentMethod => paymentMethod.kind === rfqPaymentMethod.kind)

    if (!paymentMethodMatches.length) {
      const paymentMethodKinds = allowedPaymentMethods.map(paymentMethod => paymentMethod.kind).join(', ')
      throw new Error(
        `offering does not support rfq's ${payDirection}Method kind. (rfq) ${rfqPaymentMethod.kind} was not found in: [${paymentMethodKinds}] (offering)`
      )
    }

    const ajv = new Ajv.default()
    const invalidPaymentDetailsErrors = new Set()

    for (const paymentMethodMatch of paymentMethodMatches) {
      if (!paymentMethodMatch.requiredPaymentDetails) {
        // If requiredPaymentDetails is omitted, and paymentDetails is also omitted, we have a match
        if (!rfqPaymentMethod.paymentDetails) {
          return
        }

        // paymentDetails is present even though requiredPaymentDetails is omitted. This is unsatisfactory.
        invalidPaymentDetailsErrors.add(new Error('paymentDetails must be omitted when requiredPaymentDetails is omitted'))
      } else {
        // requiredPaymentDetails is present, so Rfq's payment details must match
        const validate = ajv.compile(paymentMethodMatch.requiredPaymentDetails)
        const isValid = validate(rfqPaymentMethod.paymentDetails)
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

    const credentials = PresentationExchange.selectCredentials({ vcJwts: this.data.claims, presentationDefinition: offering.data.requiredClaims })

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

    return jsonMessage
  }
}