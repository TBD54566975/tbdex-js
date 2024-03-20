import type {
  OfferingsApi,
  ExchangesApi,
  CreateExchangeCallback,
  SubmitOrderCallback,
  SubmitCloseCallback,
  GetExchangesCallback,
  GetOfferingsCallback,
  GetExchangeCallback,
} from './types.js'

import type { Express, Request, Response } from 'express'

import express from 'express'
import cors from 'cors'

import { getExchanges, getOfferings, createExchange } from './request-handlers/index.js'
import { jsonBodyParser } from './middleware/index.js'
import { InMemoryOfferingsApi } from './in-memory-offerings-api.js'
import { InMemoryExchangesApi } from './in-memory-exchanges-api.js'
import { submitMessage } from './request-handlers/submit-message.js'
import { getExchange } from './request-handlers/get-exchange.js'

/**
 * Maps the requests to their respective callbacks handlers
 * @beta
 */
type CallbackMap = {
  getExchange?: GetExchangeCallback
  getExchanges?: GetExchangesCallback
  getOfferings?: GetOfferingsCallback
  createExchange?: CreateExchangeCallback
  submitOrder?: SubmitOrderCallback
  submitClose?: SubmitCloseCallback
}

/**
 * Options for creating a new HttpServer
 * @beta
 */
type NewHttpServerOptions = {
  offeringsApi?: OfferingsApi
  exchangesApi?: ExchangesApi,
  pfiDid: string
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

  /**
   * PFI DID
   */
  pfiDid: string

  constructor(opts?: NewHttpServerOptions) {
    this.callbacks = {}

    this.exchangesApi = opts?.exchangesApi ?? new InMemoryExchangesApi()
    this.offeringsApi = opts?.offeringsApi ?? new InMemoryOfferingsApi()
    this.pfiDid = opts?.pfiDid ?? 'did:ex:pfi'

    // initialize api here so that consumers can attach custom endpoints
    const api = express()

    api.use(cors())
    api.use(jsonBodyParser())

    this.api = api

  }

  /**
   * Set up a callback or overwrite the existing callback for the SubmitRfq endpoint
   * @param callback - A callback to be invoked when a valid Rfq is sent to the
   *                   CreateExchange endpoint.
   */
  onCreateExchange(callback: CreateExchangeCallback): void {
    this.callbacks.createExchange = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the for the SubmitMessage endpoint
   * @param callback - A callback to be invoked when a valid Order is sent to the
   *                   SubmitMessage endpoint.
   */
  onSubmitOrder(callback: SubmitOrderCallback): void {
    this.callbacks.submitOrder = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the for the SubmitMessage endpoint
   * @param callback - A callback to be invoked when a valid Close is sent to the
   *                   SubmitMessage endpoint.
   */
  onSubmitClose(callback: SubmitCloseCallback): void {
    this.callbacks.submitClose = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the GetExchange endpoint
   * @param callback - A callback to be invoked when a valid request is sent to the
   *                   GetExchange endpoint.
   */
  onGetExchange(callback: GetExchangeCallback): void {
    this.callbacks.getExchange = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the GetExchanges endpoint
   * @param callback - A callback to be invoked when a valid request is sent to the
   *                   GetExchanges endpoint.
   */
  onGetExchanges(callback: GetExchangesCallback): void {
    this.callbacks.getExchanges = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the GetOfferings endpoint
   * @param callback - A callback to be invoked when a valid request is sent to the
   *                   GetOfferings endpoint.
   */
  onGetOfferings(callback: GetOfferingsCallback): void {
    this.callbacks.getOfferings = callback
  }

  /**
   * Setup the PFI routes and start a express server to listen for incoming requests
   * @param port - server port number
   * @param callback - to be called when the server is ready
   */
  listen(port: number | string, callback?: () => void) {
    const { offeringsApi, exchangesApi, pfiDid } = this

    this.api.post('/exchanges', (req: Request, res: Response) =>
      createExchange(req, res, {
        callback: this.callbacks['createExchange'],
        offeringsApi,
        exchangesApi,
      })
    )

    this.api.put('/exchanges/:exchangeId', (req: Request, res: Response) =>
      submitMessage(req, res, {
        submitOrderCallback : this.callbacks.submitOrder,
        submitCloseCallback : this.callbacks.submitClose,
        exchangesApi,
      })
    )

    this.api.get('/exchanges/:exchangeId', (req: Request, res: Response) =>
      getExchange(req, res, {
        callback: this.callbacks.getExchange,
        exchangesApi,
        pfiDid,
      })
    )

    this.api.get('/exchanges', (req: Request, res: Response) =>
      getExchanges(req, res, {
        callback: this.callbacks.getExchanges,
        exchangesApi,
        pfiDid,
      })
    )

    this.api.get('/offerings', (req, res) =>
      getOfferings(req, res, {
        callback: this.callbacks['getOfferings'],
        offeringsApi
      })
    )

    // TODO: support hostname and backlog arguments
    return this.api.listen(port, callback)
  }
}