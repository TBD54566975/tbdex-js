import { Balance } from '@tbdex/protocol'
import { BalancesApi } from './types.js'

/**
 * An in-memory implementation of {@link BalancesApi} for example and default purposes.
 * InMemoryBalancesApi has additional methods {@link InMemoryBalancesApi.addBalance}
 * {@link InMemoryBalancesApi.clearRequesterBalances}
 * and {@link InMemoryBalancesApi.clearBalances}
 */
export class InMemoryBalancesApi implements BalancesApi {
  /** Map from requester DID to list of Balances */
  balancesMap: Map<string, Balance[]>

  constructor() {
    this.balancesMap = new Map<string, Balance[]>()
  }

  /**
   * Add a single balance resource
   * @param balance - Balance to be added to the {@link balancesMap}
   */
  addBalance(opts: {requesterDid: string, balance: Balance}): void {
    let requesterBalances = this.balancesMap.get(opts.requesterDid) ?? []
    requesterBalances.push(opts.balance)
    this.balancesMap.set(opts.requesterDid, requesterBalances)
  }

  /**
   * Clear existing list of balances for a single requester
   */
  clearRequesterBalances(opts: {requesterDid: string}): void {
    this.balancesMap.delete(opts.requesterDid)
  }

  /**
   * Clear existing list of balances
   */
  clearAllBalances(): void {
    this.balancesMap.clear()
  }

  /**
   *
   * @returns A list of balances
   */
  async getBalances(opts?: { requesterDid: string }): Promise<Balance[]> {
    if (opts === undefined || opts.requesterDid === undefined) {
      // In production, this should probably return an empty list.
      // For example and testing purposes, we return all balances.

      return Array.from(this.balancesMap.values()).flatMap(balances => balances)
    }

    return this.balancesMap.get(opts.requesterDid) ?? []
  }

}