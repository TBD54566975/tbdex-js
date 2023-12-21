import type { MessageKind, MessageKindModel, MessageMetadata, ResourceModel } from '../types.js'

import { Offering } from '../resource-kinds/index.js'
import { VerifiableCredential, PresentationExchange } from '@web5/credentials'
import { Message } from '../message.js'
import Ajv from 'ajv'

/**
 * Options passed to {@link Rfq.create}
 * @beta
 */
export type CreateRfqOptions = {
  data: MessageKindModel<'rfq'>
  metadata: Omit<MessageMetadata<'rfq'>, 'id' |'kind' | 'createdAt' | 'exchangeId'>
  private?: Record<string, any>
}

/**
 * Message sent by Alice to PFI to requesting for a quote (RFQ)
 * @beta
 */
export class Rfq extends Message<'rfq'> {
  /** a set of valid Message kinds that can come after an rfq */
  readonly validNext = new Set<MessageKind>(['quote', 'close'])

  /** private data (PII or PCI) */
  _private: Record<string, any>

  /**
   * Creates an rfq with the given options
   * @param opts - options to create an rfq
   * @returns {@link Rfq}
   */
  static create(opts: CreateRfqOptions) {
    const id = Message.generateId('rfq')
    const metadata: MessageMetadata<'rfq'> = {
      ...opts.metadata,
      kind       : 'rfq' as const,
      id         : id,
      exchangeId : id,
      createdAt  : new Date().toISOString()
    }

    // TODO: hash `data.payinMethod.paymentDetails` and set `private`
    // TODO: hash `data.payoutMethod.paymentDetails` and set `private`

    const message = { metadata, data: opts.data }
    return new Rfq(message)
  }

  /**
   * evaluates this rfq against the provided offering
   * @param offering - the offering to evaluate this rfq against
   * @throws if {@link Rfq.offeringId} doesn't match the provided offering's id
   * @throws if {@link Rfq.payinSubunits} exceeds the provided offering's max subunits allowed
   * @throws if {@link Rfq.payinMethod} property `kind` cannot be validated against the provided offering's payinMethod kinds
   * @throws if {@link Rfq.payinMethod} property `paymentDetails` cannot be validated against the provided offering's payinMethod requiredPaymentDetails
   * @throws if {@link Rfq.payoutMethod} property `kind` cannot be validated against the provided offering's payoutMethod kinds
   * @throws if {@link Rfq.payoutMethod} property `paymentDetails` cannot be validated against the provided offering's payoutMethod requiredPaymentDetails
   */
  async verifyOfferingRequirements(offering: Offering | ResourceModel<'offering'>) {
    if (offering.metadata.id !== this.offeringId)  {
      throw new Error(`offering id mismatch. (rfq) ${this.offeringId} !== ${offering.metadata.id} (offering)`)
    }

    if (this.payinSubunits > offering.data.payinCurrency.maxSubunits) {
      throw new Error(`rfq payinSubunits exceeds offering's maxSubunits. (rfq) ${this.payinSubunits} > ${offering.data.payinCurrency.maxSubunits} (offering)`)
    }

    const payinMethodMatches = offering.data.payinMethods.filter(payinMethod => payinMethod.kind === this.payinMethod.kind)

    if (!payinMethodMatches.length) {
      throw new Error(`offering does not support rfq's payinMethod kind. (rfq) ${this.payinMethod.kind} was not found in: ${offering.data.payinMethods.map(payinMethod => payinMethod.kind).join()} (offering)`)
    }

    const ajv = new Ajv.default()
    const invalidPayinDetailsErrors = new Set()

    for (const payinMethodMatch of payinMethodMatches) {
      const validate = ajv.compile(payinMethodMatch.requiredPaymentDetails)
      const isValid = validate(this.payinMethod.paymentDetails)
      if (isValid) {
        break
      }
      invalidPayinDetailsErrors.add(validate.errors)
    }

    if (invalidPayinDetailsErrors.size > 0) {
      throw new Error(`rfq payinMethod paymentDetails could not be validated against offering requiredPaymentDetails. Schema validation errors: ${Array.from(invalidPayinDetailsErrors).join()}`)
    }

    const payoutMethodMatches = offering.data.payoutMethods.filter(payoutMethod => payoutMethod.kind === this.payoutMethod.kind)

    if (!payoutMethodMatches.length) {
      throw new Error(`offering does not support rfq's payoutMethod kind. (rfq) ${this.payoutMethod.kind} was not found in: ${offering.data.payoutMethods.map(payoutMethod => payoutMethod.kind).join()} (offering)`)
    }

    const invalidPayoutDetailsErrors = new Set()

    for (const payoutMethodMatch of payoutMethodMatches) {
      const validate = ajv.compile(payoutMethodMatch.requiredPaymentDetails)
      const isValid = validate(this.payoutMethod.paymentDetails)
      if (isValid) {
        break
      }
      invalidPayoutDetailsErrors.add(validate.errors)
    }
    if (invalidPayoutDetailsErrors.size > 0) {
      throw new Error(`rfq payoutMethod paymentDetails could not be validated against offering requiredPaymentDetails. Schema validation errors: ${Array.from(invalidPayoutDetailsErrors).join()}`)
    }

    await this.verifyClaims(offering)
  }

  /**
   * checks the claims provided in this rfq against an offering's requirements
   * @param offering - the offering to check against
   * @throws if rfq's claims do not fulfill the offering's requirements
   */
  async verifyClaims(offering: Offering | ResourceModel<'offering'>) {
    const credentials = PresentationExchange.selectCredentials({ vcJwts: this.claims, presentationDefinition: offering.data.requiredClaims })

    if (!credentials.length) {
      throw new Error(`claims do not fulfill the offering's requirements`)
    }

    for (let credential of credentials) {
      await VerifiableCredential.verify({ vcJwt: credential })
    }
  }

  /** Offering which Alice would like to get a quote for */
  get offeringId() {
    return this.data.offeringId
  }

  /** Amount of payin currency you want to spend in order to receive payout currency */
  get payinSubunits() {
    return this.data.payinSubunits
  }

  /** Array of claims that satisfy the respective offering's requiredClaims */
  get claims() {
    return this.data.claims
  }

  /** Selected payment method that Alice will use to send the listed payin currency to the PFI. */
  get payinMethod() {
    return this.data.payinMethod
  }

  /** Selected payment method that the PFI will use to send the listed payout currency to Alice */
  get payoutMethod() {
    return this.data.payoutMethod
  }

  /**
   * Converts this rfq message to a json object
   */
  toJSON() {
    const jsonMessage = super.toJSON()
    jsonMessage['private'] = this._private

    return jsonMessage
  }
}