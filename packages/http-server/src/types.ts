import type { Request, Response } from 'express'
import type { Close, MessageKindClass, MessageKindClasses, Offering, Order, OrderStatus, Quote, Rfq } from '@tbdex/protocol'

/**
 * Union type for get requests
 * @beta
 */
export type GetKind = 'exchanges' | 'offerings'

/**
 * Callback handler for the get requests
 * @beta
 */
export type GetCallback<T extends GetKind> = (ctx: RequestContext, filter: Filters[T]) => any

/**
 * Map of callbacks handlers for the get requests
 * @beta
 */
export type GetCallbacks = {
  [Kind in GetKind]: GetCallback<Kind>
}

/**
 * Union type for submit requests
 * @beta
 */
export type SubmitKind = 'rfq' | 'order' | 'close'

/**
 * Callback handler for the submit requests
 * @beta
 */
export type SubmitCallback<T extends SubmitKind> = (ctx: RequestContext, message: MessageKindClasses[T]) => any

/**
 * Map of callbacks handlers for the submit requests
 * @beta
 */
export type SubmitCallbacks = {
  [Kind in SubmitKind]: SubmitCallback<Kind>
}

/**
 * Type alias for the filtering options of the get requests
 * @beta
 */
export type Filters = {
  'offerings': GetOfferingsFilter
  'exchanges': GetExchangesFilter
}

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
  exchangeId?: string[]
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
export type RequestHandler = (request: Request, response: Response) => any

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
  getExchanges(opts?: { filter: GetExchangesFilter }): Promise<MessageKindClass[][] | undefined>

  /**
   * Retrieve a single exchange if found
   */
  getExchange(opts: { id: string }): Promise<MessageKindClass[] | undefined>

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