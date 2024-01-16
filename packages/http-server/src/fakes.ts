import { DevTools, MessageKindClass, Rfq, Quote, Order, OrderStatus, Close } from '@tbdex/protocol'
import { OfferingsApi, ExchangesApi } from './main.js'

const offering = DevTools.createOffering()

export const fakeOfferingsApi: OfferingsApi = {
  async getOffering() { return offering },
  async getOfferings() { return [offering] }
}

export interface FakeExchangesApi extends ExchangesApi {
  exchangeMessagesMap: Map<string, MessageKindClass[]>,
  addMessage(message: MessageKindClass): void
  clearMessages(): void
}

export const fakeExchangesApi: FakeExchangesApi = {
  exchangeMessagesMap: new Map<string, MessageKindClass[]>(),

  getExchanges: function (): Promise<MessageKindClass[][]> {
    throw new Error('Function not implemented.')
  },

  getExchange: function (opts: { id: string} ): Promise<MessageKindClass[]> {
    const messages = this.exchangeMessagesMap.get(opts.id) || undefined
    return Promise.resolve(messages)
  },

  getRfq: function (): Promise<Rfq> {
    throw new Error('Function not implemented.')
  },

  getQuote: function (): Promise<Quote> {
    throw new Error('Function not implemented.')
  },

  getOrder: function (): Promise<Order> {
    throw new Error('Function not implemented.')
  },

  getOrderStatuses: function (): Promise<OrderStatus[]> {
    throw new Error('Function not implemented.')
  },

  getClose: function (): Promise<Close> {
    throw new Error('Function not implemented.')
  },

  addMessage: function (message: MessageKindClass): void {
    const messages = this.exchangeMessagesMap.get(message.exchangeId) || []
    messages.push(message)
    this.exchangeMessagesMap.set(message.exchangeId, messages)
  },

  clearMessages: function (): void {
    this.exchangeMessagesMap = new Map<string, MessageKindClass[]>()
  }
}