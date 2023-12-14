import type { MessageKind, MessageKindModel, MessageMetadata, ResourceModel } from '../types.js'

import { Offering } from '../resource-kinds/index.js'
import { VerifiableCredential, PresentationExchange } from '@web5/credentials'
import { Message } from '../message.js'

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
  static async create(opts: CreateRfqOptions) {
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
    const rfq = new Rfq(message)
    await Message.validate(rfq)
    return rfq
  }

  /**
   * evaluates this rfq against the provided offering
   * @param offering - the offering to evaluate this rfq against
   * @throws if {@link Rfq.offeringId} doesn't match the provided offering's id
   */
  async verifyOfferingRequirements(offering: Offering | ResourceModel<'offering'>) {
    if (offering.metadata.id !== this.offeringId)  {
      throw new Error(`offering id mismatch. (rfq) ${this.offeringId} !== ${offering.metadata.id} (offering)`)
    }

    // TODO: validate rfq's payinAmount against offering's quoteCurrency min/max

    // TODO: validate rfq's payinMethod.kind against offering's payinMethods
    // TODO: validate rfq's payinMethod.paymentDetails against offering's respective requiredPaymentDetails json schema

    // TODO: validate rfq's payoutMethod.kind against offering's payoutMethods
    // TODO: validate rfq's payoutMethod.paymentDetails against offering's respective requiredPaymentDetails json schema

    await this.verifyClaims(offering)
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
    jsonMessage['private'] = this._private

    return jsonMessage
  }
}