import type {
  OfferingsApi,
  ExchangesApi,
  SubmitRfqCallback,
  SubmitOrderCallback,
  SubmitCloseCallback,
  GetExchangesCallback,
  GetOfferingsCallback,
} from './types.js'

import type { Express } from 'express'

import express from 'express'
import cors from 'cors'

import { getExchanges, getOfferings, submitOrder, submitClose, submitRfq } from './request-handlers/index.js'
import { jsonBodyParser } from './middleware/index.js'
import { fakeExchangesApi, fakeOfferingsApi } from './fakes.js'

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

const defaults: NewHttpServerOptions = {
  offeringsApi : fakeOfferingsApi,
  exchangesApi : fakeExchangesApi,
  pfiDid       : 'did:ex:pfi'
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
    opts = { ...defaults, ...opts }
    const { offeringsApi, exchangesApi, pfiDid } = opts

    this.exchangesApi = exchangesApi
    this.offeringsApi = offeringsApi
    this.pfiDid = pfiDid

    // initialize api here so that consumers can attach custom endpoints
    const api = express()

    api.use(cors())
    api.use(jsonBodyParser())

    this.api = api

  }

  /**
   * Set up the callback for the SubmitRfq endpoint
   * @param callback 
   */
  onSubmitRfq(callback: SubmitRfqCallback): void {
    this.callbacks['rfq'] = callback
  }

  /**
   * Set up the callback for the SubmitOrder endpoint
   * @param callback 
   */
  onSubmitOrder(callback: SubmitOrderCallback): void {
    this.callbacks['order'] = callback
  }

  /**
   * Set up the callback for the SubmitClose endpoint
   * @param callback 
   */
  onSubmitClose(callback: SubmitCloseCallback): void {
    this.callbacks['close'] = callback
  }

  /**
   * Set up the callback for the GetExchanges endpoint
   * @param callback 
   */
  onGetExchanges(callback: GetExchangesCallback): void {
    this.callbacks['exchanges'] = callback
  }

  /**
   * Set up the callback for the GetOfferings endpoint
   * @param callback 
   */
  onGetOfferings(callback: GetOfferingsCallback): void {
    this.callbacks['offerings'] = callback
  }

  /**
   * Setup the PFI routes and start a express server to listen for incoming requests
   * @param port - server port number
   * @param callback - to be called when the server is ready
   */
  listen(port: number | string, callback?: () => void) {
    const { offeringsApi, exchangesApi, pfiDid } = this

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
      callback: this.callbacks['exchanges'], exchangesApi, pfiDid
    }))

    this.api.get('/offerings', getOfferings({
      callback: this.callbacks['offerings'], offeringsApi
    }))

    // TODO: support hostname and backlog arguments
    return this.api.listen(port, callback)
  }
}