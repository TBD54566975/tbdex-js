import { Exchange } from '@tbdex/protocol'
import { Message, Rfq, Quote, Order, OrderStatus, Close } from '@tbdex/protocol'
import { ExchangesApi, GetExchangesFilter } from './main.js'

/**
 * An in-memory implementation of {@link ExchangesApi} for example and default purposes.
 * InMemoryExchangesApi has additional methods {@link InMemoryExchangesApi.addMessage}
 * and {@link InMemoryExchangesApi.clearMessages}
 */
export class InMemoryExchangesApi implements ExchangesApi {
  /** Map from exchange_id to Exchange */
  exchangeMessagesMap: Map<string, Exchange>

  constructor() {
    this.exchangeMessagesMap = new Map<string, Exchange>()
  }

  async getExchanges(opts?: { filter: GetExchangesFilter }): Promise<Exchange[]> {
    if (opts === undefined || opts.filter === undefined) {
      // In production, this should probably return an empty list.
      // For example and testing purposes, we return all exchanges.

      return Array.from(this.exchangeMessagesMap.values())
    }

    const exchanges: Exchange[] = []
    if (opts.filter.id) {
      // filter has `id` and `from`

      for (const id of opts.filter.id) {
        const exchange = this.exchangeMessagesMap.get(id)
        if (exchange?.rfq?.from === opts.filter.from) {
          exchanges.push(exchange)
        }
      }
    } else {
      // filter only has `from`
      this.exchangeMessagesMap.forEach((exchange, _id) => {
        // You definitely shouldn't use FakeExchangesApi in production.
        // This will get really slow
        if (exchange?.rfq?.from === opts.filter.from) {
          exchanges.push(exchange)
        }
      })
    }

    return exchanges
  }

  async getExchange(opts: { id: string} ): Promise<Exchange | undefined> {
    const exchange = this.exchangeMessagesMap.get(opts.id)
    return Promise.resolve(exchange)
  }

  async getRfq(opts: { exchangeId: string }): Promise<Rfq | undefined> {
    const exchange = this.exchangeMessagesMap.get(opts.exchangeId)
    return exchange?.rfq
  }

  async getQuote(opts: { exchangeId: string }): Promise<Quote | undefined> {
    const exchange = this.exchangeMessagesMap.get(opts.exchangeId)
    return Promise.resolve(exchange?.quote)
  }

  async getOrder(opts: { exchangeId: string }): Promise<Order | undefined> {
    const exchange = this.exchangeMessagesMap.get(opts.exchangeId)
    return exchange?.order
  }

  async getOrderStatuses(opts: { exchangeId: string }): Promise<OrderStatus[]> {
    const exchange = this.exchangeMessagesMap.get(opts.exchangeId)
    if (exchange?.orderstatus === undefined) {
      return []
    }
    return [exchange.orderstatus]
  }

  async getClose(opts: { exchangeId: string }): Promise<Close | undefined> {
    const exchange = this.exchangeMessagesMap.get(opts.exchangeId)
    return exchange?.close
  }

  addMessage(message: Message): void {
    const exchange = this.exchangeMessagesMap.get(message.exchangeId) ?? new Exchange()
    exchange.addNextMessage(message)
    this.exchangeMessagesMap.set(message.exchangeId, exchange)
  }

  clearMessages(): void {
    this.exchangeMessagesMap = new Map<string, Exchange>()
  }
}