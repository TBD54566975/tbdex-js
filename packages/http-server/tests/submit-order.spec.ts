import { ErrorDetail, Message, Quote, Rfq } from '@tbdex/http-client'
import type { Server } from 'http'

import { DevTools, Order, RequestContext, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { InMemoryExchangesApi } from '../src/in-memory-exchanges-api.js'
import Sinon from 'sinon'
import { DidJwk } from '@web5/dids'


describe('POST /exchanges/:exchangeId/order', () => {
  let api: TbdexHttpServer
  let server: Server

  beforeEach(() => {
    api = new TbdexHttpServer()
    server = api.listen(8000)
  })

  afterEach(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 400 if no request body is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method: 'POST'
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('expected request body to be a json object')
  })

  it('returns a 400 if request body is not a valid json object', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : '!@!#'
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('JSON')
  })

  it(`returns a 404 if the exchange doesn't exist`, async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()
    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : '123',
        protocol   : '1.0'
      }
    })
    await order.sign(aliceDid)
    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : JSON.stringify(order)
    })

    expect(resp.status).to.equal(404)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('No exchange found for')
  })

  it('returns a 400 if request body is not a valid order object', async () => {
    // scenario: Send an Rfq to the submitOrder endpoint

    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    await rfq.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : JSON.stringify(rfq)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Request body was not a valid Order message')
  })

  it('returns a 400 if request body if integrity check fails', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : Message.generateId('rfq'),
        protocol   : '1.0'
      },
    })
    // deliberately omit await order.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : JSON.stringify(order)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include( 'Request body was not a valid Order message')
  })

  it(`returns a 409 if order is not allowed based on the exchange's current state`, async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()
    const rfq = Rfq.create({
      metadata: {
        from     : aliceDid.uri,
        to       : pfiDid.uri,
        protocol : '1.0'
      },
      data: await DevTools.createRfqData()
    })
    await rfq.sign(aliceDid);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
    })
    await order.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : JSON.stringify(order)
    })

    expect(resp.status).to.equal(409)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Cannot submit Order for an exchange where the last message is kind:')
  })

  it(`returns a 400 if quote has expired`, async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    // Add an exchange which has a Quote that expired 10 seconds ago
    const rfq = Rfq.create({
      metadata: {
        from     : aliceDid.uri,
        to       : pfiDid.uri,
        protocol : '1.0'
      },
      data: await DevTools.createRfqData()
    })
    await rfq.sign(aliceDid)
    const quote = Quote.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
      data: {
        ...DevTools.createQuoteData(),
        expiresAt: new Date(Date.now() - 10_000).toISOString()
      }
    })
    await quote.sign(pfiDid);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(quote)

    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
    })
    await order.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : JSON.stringify(order)
    })

    expect(resp.status).to.equal(410)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Quote is expired')
  })

  it('returns a 202 if order is accepted', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    // Add an exchange of Rfq and Quote to the exchangesApi
    const rfq = Rfq.create({
      metadata: {
        from     : aliceDid.uri,
        to       : pfiDid.uri,
        protocol : '1.0'
      },
      data: await DevTools.createRfqData()
    })
    await rfq.sign(aliceDid)
    const quote = Quote.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
      data: {
        ...DevTools.createQuoteData(),
        expiresAt: new Date(Date.now() + 10_000).toISOString()
      }
    })
    await quote.sign(pfiDid);

    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(quote)

    // Create order that is valid within the existing exchange
    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
    })
    await order.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
      method : 'POST',
      body   : JSON.stringify(order)
    })

    expect(resp.status).to.equal(202)
  })

  describe('onSubmitClose callback', () => {
    it('returns a 202 if the provided callback succeeds and passes correct arguments to callback', async () => {
      const aliceDid = await DidJwk.create()
      const pfiDid = await DidJwk.create()

      // Add an exchange of Rfq and Quote to the exchangesApi
      const rfq = Rfq.create({
        metadata: {
          from     : aliceDid.uri,
          to       : pfiDid.uri,
          protocol : '1.0'
        },
        data: await DevTools.createRfqData()
      })
      await rfq.sign(aliceDid)
      const quote = Quote.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
        },
        data: {
          ...DevTools.createQuoteData(),
          expiresAt: new Date(Date.now() + 10_000).toISOString()
        }
      })
      await quote.sign(pfiDid);

      (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq);
      (api.exchangesApi as InMemoryExchangesApi).addMessage(quote)

      // Create order that is valid within the existing exchange
      const order = Order.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
        },
      })
      await order.sign(aliceDid)

      const callbackSpy = Sinon.spy((_ctx: RequestContext, _message: Order) => Promise.resolve())

      api.onSubmitOrder(callbackSpy)

      const resp = await fetch('http://localhost:8000/exchanges/123/order', {
        method : 'POST',
        body   : JSON.stringify(order)
      })

      expect(resp.status).to.equal(202)

      expect(callbackSpy.calledOnce).to.be.true
      expect(callbackSpy.firstCall.lastArg).to.deep.eq(order)
    })
  })
})