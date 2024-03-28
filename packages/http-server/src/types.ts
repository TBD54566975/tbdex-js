import type { Request, Response } from 'express'
import type { Balance, Close, Exchange, Offering, Order, OrderStatus, Quote, Rfq } from '@tbdex/protocol'


/**
 * Callback handler for GetExchange requests
 * @beta
 */
export type GetExchangeCallback = (ctx: RequestContext) => any

/**
 * Callback handler for GetExchanges requests
 * @beta
 */
export type GetExchangesCallback = (ctx: RequestContext, filter: GetExchangesFilter) => any

/**
 * Callback handler for GetOfferings requests
 * @beta
 */
export type GetOfferingsCallback = (ctx: RequestContext) => any

/**
 * Callback handler for GetBalances requests
 * @beta
 */
export type GetBalancesCallback = (ctx: RequestContext) => any

/**
 * Callback handler for the SubmitRfq requests
 * @beta
 */
export type CreateExchangeCallback = (ctx: RequestContext, message: Rfq, opts: { offering: Offering, replyTo?: string }) => Promise<void>

/**
 * Callback handler for the SubmitMessage requests that submit an Order
 * @beta
 */
export type SubmitOrderCallback = (ctx: RequestContext, message: Order) => Promise<void>

/**
 * Callback handler for the SubmitMessage requests that submit a Close
 * @beta
 */
export type SubmitCloseCallback = (ctx: RequestContext, message: Close) => Promise<void>

/**
 * Callback handler for the SubmitMessage requests
 * @beta
 */
export type SubmitMessageCallback = SubmitOrderCallback | SubmitCloseCallback

/**
 * Filter options for retrieving a list of exchanges
 * @beta
 */
export type GetExchangesFilter = {
  /** List of exchanges ids */
  id?: string[]
  /** the rfq author's DID */
  from: string
}

/**
 * Type alias for the request context
 * @beta
 */
export type RequestContext = {
  /** Express request type */
  request: Request
  /** Express response type */
  response: Response
}

/**
 * PFI Offerings API
 * @beta
 */
export interface OfferingsApi {
  /**
   * Retrieve a single offering if found
   */
  getOffering(opts: { id: string }): Promise<Offering | undefined>

  /**
   * Retrieve a list of offerings based on the given filter
   */
  getOfferings(): Promise<Offering[]>
}

/**
 * PFI Balances API
 * @beta
 */
export interface BalancesApi {
  /**
   * Retrieve a list of balances
   */
  getBalances(): Promise<Balance[]>
}

/**
 * PFI Exchanges API
 * @beta
 */
export interface ExchangesApi {
  /**
   * Retrieve a list of exchanges based on the given filter
   */
  getExchanges(opts?: { filter: GetExchangesFilter }): Promise<Exchange[]>

  /**
   * Retrieve a single exchange if found
   */
  getExchange(opts: { id: string }): Promise<Exchange | undefined>

  /**
   * Retrieve a RFQ if found
   */
  getRfq(opts: { exchangeId: string }): Promise<Rfq | undefined>

  /**
   * Retrieve a Quote if found
   */
  getQuote(opts: { exchangeId: string }): Promise<Quote | undefined>

  /**
   * Retrieve an Order if found
   */
  getOrder(opts: { exchangeId: string }): Promise<Order | undefined>

  /**
   * Retrieve the OrderStatuses if found
   */
  getOrderStatuses(opts: { exchangeId: string }): Promise<OrderStatus[]>

  /**
   * Retrieve the Close reason if found
   */
  getClose(opts: { exchangeId: string }): Promise<Close | undefined>
}