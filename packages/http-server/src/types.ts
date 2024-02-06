import type { Request, Response } from 'express'
import type { Close, Message, Offering, Order, OrderStatus, Quote, Rfq } from '@tbdex/protocol'
import type { ErrorDetail } from '@tbdex/http-client'

/**
 * Callback handler for GetExchanges requests
 * @beta
 */
export type GetExchangesCallback = (ctx: RequestContext, filter: GetExchangesFilter) => any

/**
 * Callback handler for GetOfferings requests
 * @beta
 */
export type GetOfferingsCallback = (ctx: RequestContext, filter: GetOfferingsFilter) => any

/**
 * Callback handler for the SubmitRfq requests
 * @beta
 */
export type SubmitRfqCallback = (ctx: RequestContext, message: Rfq, opts: { offering: Offering }) => Promise<void>

/**
 * Callback handler for the SubmitOrder requests
 * @beta
 */
export type SubmitOrderCallback = (ctx: RequestContext, message: Order) => Promise<void>

/**
 * Callback handler for the SubmitClose requests
 * @beta
 */
export type SubmitCloseCallback = (ctx: RequestContext, message: Close) => Promise<void>

/**
 * Filter options for retrieving a list of offerings
 * @beta
 */
export type GetOfferingsFilter = {
  /** Currency that the PFI is buying in exchange for payout currency - ISO 3166 currency code string */
  payinCurrency?: string

  /** Currency that the PFI is selling - ISO 3166 currency code string */
  payoutCurrency?: string

  /** Offering ID */
  id?: string
}

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
 * Type alias for the request handler
 * @beta
 */
export type RequestHandler = (request: Request, response: Response<{ errors?: ErrorDetail[], data?: any }>) => any

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
  getOfferings(opts?: { filter: GetOfferingsFilter }): Promise<Offering[] | undefined>
}

/**
 * PFI Exchanges API
 * @beta
 */
export interface ExchangesApi {
  /**
   * Retrieve a list of exchanges based on the given filter
   */
  getExchanges(opts?: { filter: GetExchangesFilter }): Promise<Message[][] | undefined>

  /**
   * Retrieve a single exchange if found
   */
  getExchange(opts: { id: string }): Promise<Message[] | undefined>

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
   * Retrieve the order statuses if found
   */
  getOrderStatuses(opts: { exchangeId: string }): Promise<OrderStatus[] | undefined>

  /**
   * Retrieve the close reason if found
   */
  getClose(opts: { exchangeId: string }): Promise<Close | undefined>
}