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

type RequestKind = GetKind | SubmitKind
type CallbackMap = {
  [Kind in RequestKind]?: Kind extends GetKind ? GetCallback<Kind>
    : Kind extends SubmitKind ? SubmitCallback<Kind>
    : never
}

type NewHttpServerOptions = {
  offeringsApi?: OfferingsApi
  exchangesApi?: ExchangesApi
}

const defaults: NewHttpServerOptions = {
  offeringsApi : fakeOfferingsApi,
  exchangesApi : fakeExchangesApi
}
export class TbdexHttpServer {
  callbacks: CallbackMap
  api: Express
  exchangesApi: ExchangesApi
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

  submit<T extends SubmitKind>(messageKind: T, callback: SubmitCallbacks[T]) {
    this.callbacks[messageKind] = callback
  }

  get<T extends GetKind>(resourceKind: T, callback: GetCallbacks[T]) {
    this.callbacks[resourceKind] = callback
  }

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