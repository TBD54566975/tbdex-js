import { Balance } from '@tbdex/protocol'
import { BalancesApi } from './types.js'

/**
 * An in-memory implementation of {@link BalancesApi} for example and default purposes.
 * InMemoryBalancesApi has additional methods {@link InMemoryBalancesApi.addBalance}
 * and {@link InMemoryBalancesApi.clearBalances}
 */
export class InMemoryBalancesApi implements BalancesApi {
  /** Map from balance_id to Balance */
  balancesMap: Map<string, Balance>

  constructor() {
    this.balancesMap = new Map<string, Balance>()
  }

  /**
   * Add a single balance resource
   * @param balance - Balance to be added to the {@link balancesMap}
   */
  addBalance(balance: Balance): void {
    this.balancesMap.set(balance.metadata.id, balance)
  }

  /**
   * Clear existing list of balances
   */
  clearBalances(): void {
    this.balancesMap.clear()
  }

  /**
   *
   * @returns A list of balances
   */
  async getBalances(): Promise<Balance[]> {
    return Array.from(this.balancesMap.values())
  }

}