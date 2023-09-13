import type { ResourceKindModel, ResourceMetadata } from '../types.js'
import { Resource } from '../resource.js'

/** options passed to {@link Offering.create} */
export type CreateOfferingOptions = {
  data: ResourceKindModel<'offering'>
  metadata: Omit<ResourceMetadata<'offering'>, 'id' |'kind' | 'createdAt' | 'updatedAt'>
}

/**
 * An Offering is used by the PFI to describe a currency pair they have to offer
 * including the requirements, conditions, and constraints in
 * order to fulfill that offer.
 */
export class Offering extends Resource<'offering'> {
  static create(opts: CreateOfferingOptions) {
    const metadata: ResourceMetadata<'offering'> = {
      ...opts.metadata,
      kind      : 'offering',
      id        : Resource.generateId('offering'),
      createdAt : new Date().toISOString()
    }

    const message = { metadata, data: opts.data }
    return new Offering(message)
  }

  /** Brief description of what is being offered. */
  get description() {
    return this.data.description
  }

  /** Number of payout currency units for one payin currency unit (i.e 290000 USD for 1 BTC) */
  get payoutUnitsPerPayinUnit() {
    return this.data.payoutUnitsPerPayinUnit
  }

  /** Details about the currency that the PFI is buying in exchange for payoutCurrency. */
  get payinCurrency() {
    return this.data.payinCurrency
  }

  /** Details about the currency that the PFI is buying in exchange for payinCurrency. */
  get payoutCurrency() {
    return this.data.payoutCurrency
  }


  /** A list of accepted payment methods that Alice can use to send payinCurrency to a PFI */
  get payinMethods() {
    return this.data.payinMethods
  }

  /** A list of accepted payment methods that Alice can use to receive payoutCurrency from a PFI */
  get payoutMethods() {
    return this.data.payoutMethods
  }

  /** Articulates the claim(s) required when submitting an RFQ for this offering. */
  get requiredClaims() {
    return this.data.requiredClaims
  }
}