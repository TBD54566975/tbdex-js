import type { MessageKind, MessageKindModel, MessageMetadata, PaymentMethod, ResourceModel, SelectedPaymentMethod } from '../types.js'

import { BigNumber } from 'bignumber.js'
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
    Message.validateData('rfq', message.data)
    return new Rfq(message)
  }

  /**
   * evaluates this rfq against the provided offering
   * @param offering - the offering to evaluate this rfq against
   * @throws if {@link Rfq.offeringId} doesn't match the provided offering's id
   * @throws if {@link Rfq.payinAmount} exceeds the provided offering's max units allowed or is below the offering's min units allowed
   * @throws if {@link Rfq.payinMethod} property `kind` cannot be validated against the provided offering's payinMethod kinds
   * @throws if {@link Rfq.payinMethod} property `paymentDetails` cannot be validated against the provided offering's payinMethod requiredPaymentDetails
   * @throws if {@link Rfq.payoutMethod} property `kind` cannot be validated against the provided offering's payoutMethod kinds
   * @throws if {@link Rfq.payoutMethod} property `paymentDetails` cannot be validated against the provided offering's payoutMethod requiredPaymentDetails
   */
  async verifyOfferingRequirements(offering: Offering | ResourceModel<'offering'>) {
    if (offering.metadata.id !== this.offeringId)  {
      throw new Error(`offering id mismatch. (rfq) ${this.offeringId} !== ${offering.metadata.id} (offering)`)
    }

    // Verifyin payin amount is less than maximum
    let payinAmount: BigNumber
    if (offering.data.payinCurrency.maxAmount) {
      payinAmount = BigNumber(this.payinAmount)
      const maxAmount = BigNumber(offering.data.payinCurrency.maxAmount)

      if (payinAmount.isGreaterThan(maxAmount)) {
        throw new Error(`rfq payinAmount exceeds offering's maxAmount. (rfq) ${this.payinAmount} > ${offering.data.payinCurrency.maxAmount} (offering)`)
      }
    }

    // Verify payin amount is more than minimum
    if (offering.data.payinCurrency.minAmount) {
      payinAmount ??= BigNumber(this.payinAmount)
      const minAmount = BigNumber(offering.data.payinCurrency.minAmount)

      if (payinAmount.isLessThan(minAmount)) {
        throw new Error(`rfq payinAmount is below offering's minAmount. (rfq) ${this.payinAmount} > ${offering.data.payinCurrency.minAmount} (offering)`)
      }
    }

    // Verify payin/payout methods
    this.verifyPaymentMethod(this.payinMethod, offering.data.payinMethods, 'payin')
    this.verifyPaymentMethod(this.payoutMethod, offering.data.payoutMethods, 'payout')

    await this.verifyClaims(offering)
  }

  /**
   * Validate the Rfq's payin/payout method against an Offering's allow payin/payout methods
   *
   * @param rfqPaymentMethod - The Rfq's selected payin/payout method being validated
   * @param allowedPaymentMethods - The Offering's allowed payin/payout methods
   *
   * @throws if {@link Rfq.payinMethod} property `kind` cannot be validated against the provided offering's payinMethod kinds
   * @throws if {@link Rfq.payinMethod} property `paymentDetails` cannot be validated against the provided offering's payinMethod requiredPaymentDetails
   * @throws if {@link Rfq.payoutMethod} property `kind` cannot be validated against the provided offering's payoutMethod kinds
   * @throws if {@link Rfq.payoutMethod} property `paymentDetails` cannot be validated against the provided offering's payoutMethod requiredPaymentDetails
   */
  private verifyPaymentMethod(
    rfqPaymentMethod: SelectedPaymentMethod,
    allowedPaymentMethods: PaymentMethod[],
    payDirection: 'payin' | 'payout'
  ): void {
    const paymentMethodMatches = allowedPaymentMethods.filter(paymentMethod => paymentMethod.kind === rfqPaymentMethod.kind)

    if (!paymentMethodMatches.length) {
      const paymentMethodKinds = allowedPaymentMethods.map(paymentMethod => paymentMethod.kind).join()
      throw new Error(
        `offering does not support rfq's ${payDirection}Method kind. (rfq) ${rfqPaymentMethod.kind} was not found in: ${paymentMethodKinds} (offering)`
      )
    }

    const ajv = new Ajv.default()
    const invalidPaymentDetailsErrors = new Set()

    // Only one matching paymentMethod is needed
    for (const paymentMethodMatch of paymentMethodMatches) {
      const validate = ajv.compile(paymentMethodMatch.requiredPaymentDetails)
      const isValid = validate(rfqPaymentMethod.paymentDetails)
      if (isValid) {
        break
      }
      invalidPaymentDetailsErrors.add(validate.errors)
    }

    if (invalidPaymentDetailsErrors.size > 0) {
      throw new Error(`rfq ${payDirection}Method paymentDetails could not be validated against offering requiredPaymentDetails. Schema validation errors: ${Array.from(invalidPaymentDetailsErrors).join()}`)
    }
  }

  /**
   * checks the claims provided in this rfq against an offering's requirements
   * @param offering - the offering to check against
   * @throws if rfq's claims do not fulfill the offering's requirements
   */
  async verifyClaims(offering: Offering | ResourceModel<'offering'>) {
    const credentials = PresentationExchange.selectCredentials(this.claims, offering.data.requiredClaims)

    if (!credentials.length) {
      throw new Error(`claims do not fulfill the offering's requirements`)
    }

    for (let credential of credentials) {
      await VerifiableCredential.verify(credential)
    }
  }

  /** Offering which Alice would like to get a quote for */
  get offeringId() {
    return this.data.offeringId
  }

  /** Amount of payin currency you want to spend in order to receive payout currency */
  get payinAmount() {
    return this.data.payinAmount
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
    if (this._private) {
      jsonMessage['private'] = this._private
    }

    return jsonMessage
  }
}