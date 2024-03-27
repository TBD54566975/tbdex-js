import { Offering } from '@tbdex/protocol'
import { GetOfferingsFilter, OfferingsApi } from './types.js'

/**
 * An in-memory implementation of {@link OfferingsApi} for example and default purposes.
 * InMemoryOfferingsApi has additional methods {@link InMemoryOfferingsApi.addOffering}
 * and {@link InMemoryOfferingsApi.clearOfferings}
 */
export class InMemoryOfferingsApi implements OfferingsApi {
  /** Map from offering_id to Offering */
  offeringsMap: Map<string, Offering>

  constructor() {
    this.offeringsMap = new Map<string, Offering>()
  }

  /**
   * Add a single offering
   * @param offering - Offering to be added to the {@link offeringsMap}
   */
  addOffering(offering: Offering): void {
    this.offeringsMap.set(offering.metadata.id, offering)
  }

  /**
   * Clear existing list offerings
   */
  clearOfferings(): void {
    this.offeringsMap.clear()
  }

  /**
   * Retrieve a single offering if found
   * @param opts - Filter with id used to select an offering
   * @returns An offering if one exists, else undefined
   */
  async getOffering(opts: { id: string }): Promise<Offering | undefined>{
    return this.offeringsMap.get(opts.id)
  }

  /**
   *
   * @param opts - Filter used to select offerings
   * @returns A list of offerings matching the filter
   */
  async getOfferings(opts?: { filter: GetOfferingsFilter }): Promise<Offering[]> {
    const allOfferings = Array.from(this.offeringsMap.values())

    if (opts?.filter === undefined || Object.values(opts.filter).every(v => v === undefined)) {
      // If no filter is provided, return all offerings
      return allOfferings
    }

    const { filter: {
      id,
      payinCurrency,
      payoutCurrency,
      payinMethodKind,
      payoutMethodKind,
    } } = opts

    return allOfferings.filter((offering) => {
      // If filter includes a field, make sure the returned offerings match
      return (!id || id === offering.metadata.id) &&
             (!payinCurrency || payinCurrency === offering.data.payin.currencyCode) &&
             (!payoutCurrency || payoutCurrency === offering.data.payout.currencyCode) &&
             (!payinMethodKind || offering.data.payin.methods.map(pm => pm.kind).includes(payinMethodKind)) &&
             (!payoutMethodKind || offering.data.payout.methods.map(pm => pm.kind).includes(payoutMethodKind))
    })
  }

}