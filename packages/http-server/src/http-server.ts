import type {
  GetCallback,
  GetCallbacks,
  GetKind,
  SubmitCallback,
  SubmitCallbacks,
  SubmitKind,
  OfferingsApi,
  ExchangesApi,
} from './types.js'

import type { Express } from 'express'

import express from 'express'
import cors from 'cors'

import { getExchanges, getOfferings, submitOrder, submitClose, submitRfq } from './request-handlers/index.js'
import { jsonBodyParser } from './middleware/index.js'
import { fakeExchangesApi, fakeOfferingsApi } from './fakes.js'

/**
 * Union type alias for the RequestKind
 * @beta
 */
type RequestKind = GetKind | SubmitKind

/**
 * Maps the requests to their respective callbacks handlers
 * @beta
 */
type CallbackMap = {
  [Kind in RequestKind]?: Kind extends GetKind ? GetCallback<Kind>
    : Kind extends SubmitKind ? SubmitCallback<Kind>
    : never
}

/**
 * Options for creating a new HttpServer
 * @beta
 */
type NewHttpServerOptions = {
  offeringsApi?: OfferingsApi
  exchangesApi?: ExchangesApi
}

const defaults: NewHttpServerOptions = {
  offeringsApi : fakeOfferingsApi,
  exchangesApi : fakeExchangesApi
}

/**
 * TBDex HTTP Server powered by Express
 * @beta
 */
export class TbdexHttpServer {
  /**
   * Map of callbacks handlers for the available requests
   */
  callbacks: CallbackMap

  /**
   * Express server instance
   */
  api: Express

  /**
   * PFI Exchanges API
   */
  exchangesApi: ExchangesApi

  /**
   * PFI Offerings API
   */
  offeringsApi: OfferingsApi

  constructor(opts?: NewHttpServerOptions) {
    this.callbacks = {}
    opts = { ...defaults, ...opts }
    const { offeringsApi, exchangesApi } = opts

    this.exchangesApi = exchangesApi
    this.offeringsApi = offeringsApi

    // initialize api here so that consumers can attach custom endpoints
    const api = express()

    api.use(cors())
    api.use(jsonBodyParser())

    this.api = api

  }

  /**
   * Setup the callback for the available Submit Requests (eg. RFQ, Order, Close)
   * @param messageKind - the kind of message to be handled
   * @param callback - the handler for the message
   */
  submit<T extends SubmitKind>(messageKind: T, callback: SubmitCallbacks[T]) {
    this.callbacks[messageKind] = callback
  }

  /**
   * Setup the callback for the available Get Requests (eg. offerings, exchanges)
   * @param resourceKind - the kind of resource to be handled
   * @param callback - the handler for the resource
   */
  get<T extends GetKind>(resourceKind: T, callback: GetCallbacks[T]) {
    this.callbacks[resourceKind] = callback
  }

  /**
   * Setup the PFI routes and start a express server to listen for incoming requests
   * @param port - server port number
   * @param callback - to be called when the server is ready
   */
  listen(port: number | string, callback?: () => void) {
    const { offeringsApi, exchangesApi } = this

    this.api.post('/exchanges/:exchangeId/rfq', submitRfq({
      callback: this.callbacks['rfq'], offeringsApi, exchangesApi,
    }))

    this.api.post('/exchanges/:exchangeId/order', submitOrder({
      callback: this.callbacks['order'], exchangesApi
    }))

    this.api.post('/exchanges/:exchangeId/close', submitClose({
      callback: this.callbacks['close'], exchangesApi
    }))

    this.api.get('/exchanges', getExchanges({
      callback: this.callbacks['exchanges'], exchangesApi
    }))

    this.api.get('/offerings', getOfferings({
      callback: this.callbacks['offerings'], offeringsApi
    }))

    // TODO: support hostname and backlog arguments
    return this.api.listen(port, callback)
  }
}