import type {
  OfferingsApi,
  ExchangesApi,
  SubmitRfqCallback,
  SubmitOrderCallback,
  SubmitCloseCallback,
  GetExchangesCallback,
  GetOfferingsCallback,
} from './types.js'

import type { Express, Request, Response } from 'express'

import express from 'express'
import cors from 'cors'

import { getExchanges, getOfferings, submitOrder, submitClose, createExchange } from './request-handlers/index.js'
import { jsonBodyParser } from './middleware/index.js'
import { InMemoryOfferingsApi } from './in-memory-offerings-api.js'
import { InMemoryExchangesApi } from './in-memory-exchanges-api.js'

/**
 * Maps the requests to their respective callbacks handlers
 * @beta
 */
type CallbackMap = {
  exchanges?: GetExchangesCallback
  offerings?: GetOfferingsCallback
  rfq?: SubmitRfqCallback
  order?: SubmitOrderCallback
  close?: SubmitCloseCallback
}

/**
 * Options for creating a new HttpServer
 * @beta
 */
type NewHttpServerOptions = {
  offeringsApi?: OfferingsApi
  exchangesApi?: ExchangesApi,
  pfiDid?: string
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
  onSubmitRfq(callback: SubmitRfqCallback): void {
    this.callbacks.rfq = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the for the SubmitOrder endpoint
   * @param callback - A callback to be invoked when a valid Order is sent to the
   *                   SubmitOrder endpoint.
   */
  onSubmitOrder(callback: SubmitOrderCallback): void {
    this.callbacks.order = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the SubmitClose endpoint.
   * @param callback - A callback to be invoked when a valid Close is sent to the
   *                   SubmitClose endpoint.
   */
  onSubmitClose(callback: SubmitCloseCallback): void {
    this.callbacks.close = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the GetExchanges endpoint
   * @param callback - A callback to be invoked when a valid request is sent to the
   *                   GetExchanges endpoint.
   */
  onGetExchanges(callback: GetExchangesCallback): void {
    this.callbacks.exchanges = callback
  }

  /**
   * Set up a callback or overwrite the existing callback for the GetOfferings endpoint
   * @param callback - A callback to be invoked when a valid request is sent to the
   *                   GetOfferings endpoint.
   */
  onGetOfferings(callback: GetOfferingsCallback): void {
    this.callbacks.offerings = callback
  }

  /**
   * Setup the PFI routes and start a express server to listen for incoming requests
   * @param port - server port number
   * @param callback - to be called when the server is ready
   */
  listen(port: number | string, callback?: () => void) {
    const { offeringsApi, exchangesApi, pfiDid } = this

    this.api.post('/exchanges/:exchangeId/rfq', (req: Request, res: Response) =>
      createExchange(req, res, {
        callback: this.callbacks['rfq'],
        offeringsApi,
        exchangesApi,
      })
    )

    this.api.post('/exchanges/:exchangeId/order', (req: Request, res: Response) =>
      submitOrder(req, res, {
        callback: this.callbacks['order'],
        exchangesApi
      })
    )

    this.api.post('/exchanges/:exchangeId/close', (req: Request, res: Response) =>
      submitClose(req, res,{
        callback: this.callbacks.close,
        exchangesApi,
      })
    )

    this.api.get('/exchanges', (req: Request, res: Response) =>
      getExchanges(req, res, {
        callback: this.callbacks.exchanges,
        exchangesApi,
        pfiDid,
      })
    )

    this.api.get('/offerings', (req, res) =>
      getOfferings(req, res, {
        callback: this.callbacks['offerings'],
        offeringsApi
      })
    )

    // TODO: support hostname and backlog arguments
    return this.api.listen(port, callback)
  }
}