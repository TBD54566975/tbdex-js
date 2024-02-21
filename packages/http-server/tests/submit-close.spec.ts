import { ErrorDetail, Message } from '@tbdex/http-client'
import type { Server } from 'http'

import { Close, DevTools, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { InMemoryExchangesApi } from '../src/in-memory-exchanges-api.js'
import Sinon from 'sinon'


describe('POST /exchanges/:exchangeId/close', () => {
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
    const resp = await fetch('http://localhost:8000/exchanges/close', {
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
    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : '!@!#'
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json()  as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('JSON')
  })

  it('returns a 400 if request body is not a valid close object', async () => {
    const alice = await DevTools.createDid()
    const rfq = DevTools.createRfq({
      sender: alice
    })
    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(rfq)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json()  as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Request body was not a valid Close message')
  })

  it(`returns a 404 if the exchange doesn't exist`, async () => {
    const alice = await DevTools.createDid()
    const pfi = await DevTools.createDid()
    const close = Close.create({
      metadata: {
        from       : alice.uri,
        to         : pfi.uri,
        exchangeId : '123'
      },
      data: {}
    })
    await close.sign(alice)
    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(404)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('No exchange found for')
  })

  it(`returns a 409 if close is not allowed based on the exchange's current state`, async () => {
    const alice = await DevTools.createDid()
    const pfi = await DevTools.createDid()

    const rfq = await DevTools.createRfq({
      sender   : alice,
      receiver : pfi,
    })
    await rfq.sign(alice)
    const close = Close.create({
      metadata: {
        from       : alice.uri,
        to         : pfi.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {}
    })
    await close.sign(alice)

    const exchangesApi = api.exchangesApi as InMemoryExchangesApi
    exchangesApi.addMessage(rfq)
    exchangesApi.addMessage(close)

    const close2 = Close.create({
      metadata: {
        from       : alice.uri,
        to         : pfi.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {}
    })
    await close2.sign(alice)
    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(close2)
    })

    expect(resp.status).to.equal(409)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('cannot submit Close for an exchange where the last message is kind: close')
  })

  it('returns a 400 if request body if integrity check fails', async () => {
    const alice = await DevTools.createDid()
    const pfi = await DevTools.createDid()

    const rfq = await DevTools.createRfq({
      sender   : alice,
      receiver : pfi,
    })
    await rfq.sign(alice)

    const exchangesApi = api.exchangesApi as InMemoryExchangesApi
    exchangesApi.addMessage(rfq)

    // Create but do not sign Close message
    const close = Close.create({
      metadata: {
        from       : alice.uri,
        to         : pfi.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {}
    })


    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Request body was not a valid Close message')
  })

  it('returns a 202 if close is created by alice', async () => {
    // scenario: Alice creates an exchange and submits a Close message

    const alice = await DevTools.createDid()
    const pfi = await DevTools.createDid()

    const rfq = await DevTools.createRfq({
      sender   : alice,
      receiver : pfi,
    })
    await rfq.sign(alice)

    const exchangesApi = api.exchangesApi as InMemoryExchangesApi
    exchangesApi.addMessage(rfq)

    // Close message signed by Alice
    const close = Close.create({
      metadata: {
        from       : alice.uri,
        to         : pfi.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {}
    })
    await close.sign(alice)

    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(202)
  })

  it('returns a 202 if close is created by pfi', async () => {
    // scenario: Alice creates an exchange and PFI submits a Close message

    const alice = await DevTools.createDid()
    const pfi = await DevTools.createDid()

    const rfq = await DevTools.createRfq({
      sender   : alice,
      receiver : pfi,
    })
    await rfq.sign(alice)

    const exchangesApi = api.exchangesApi as InMemoryExchangesApi
    exchangesApi.addMessage(rfq)

    // Close message signed by PFI
    const close = Close.create({
      metadata: {
        from       : pfi.uri,
        to         : alice.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {}
    })
    await close.sign(pfi)

    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(202)
  })

  it('returns a 400 if the close is created by neither alice nor pfi', async () => {

    const alice = await DevTools.createDid()
    const pfi = await DevTools.createDid()
    const imposter = await DevTools.createDid()

    const rfq = await DevTools.createRfq({
      sender   : alice,
      receiver : pfi,
    })
    await rfq.sign(alice)

    const exchangesApi = api.exchangesApi as InMemoryExchangesApi
    exchangesApi.addMessage(rfq)

    // Close message signed by the imposter
    const close = Close.create({
      metadata: {
        from       : imposter.uri,
        to         : pfi.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {}
    })
    await close.sign(imposter)

    const resp = await fetch('http://localhost:8000/exchanges/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Only the creator and receiver of an exchange may close the exchange')
  })

  describe('onSubmitClose callback', () => {
    it('does not call the callback if the close is is not valid for the current exchange', async () => {
      const alice = await DevTools.createDid()
      const pfi = await DevTools.createDid()

      // Close message signed by Alice
      const close = Close.create({
        metadata: {
          from       : alice.uri,
          to         : pfi.uri,
          exchangeId : Message.generateId('rfq')
        },
        data: {}
      })
      await close.sign(alice)

      const callbackSpy = Sinon.spy(() => Promise.resolve())
      api.onSubmitClose(callbackSpy)

      const resp = await fetch('http://localhost:8000/exchanges/close', {
        method : 'POST',
        body   : JSON.stringify(close)
      })

      expect(resp.status).to.equal(404)
      expect(callbackSpy.notCalled).to.be.true
    })

    it('returns a 202 if the provided callback succeeds and passes correct arguments to callback', async () => {
      const alice = await DevTools.createDid()
      const pfi = await DevTools.createDid()

      const rfq = await DevTools.createRfq({
        sender   : alice,
        receiver : pfi,
      })
      await rfq.sign(alice)

      const exchangesApi = api.exchangesApi as InMemoryExchangesApi
      exchangesApi.addMessage(rfq)

      // Close message signed by Alice
      const close = Close.create({
        metadata: {
          from       : alice.uri,
          to         : pfi.uri,
          exchangeId : rfq.metadata.exchangeId
        },
        data: {}
      })
      await close.sign(alice)

      const callbackSpy = Sinon.spy(() => Promise.resolve())
      api.onSubmitClose(callbackSpy)

      const resp = await fetch('http://localhost:8000/exchanges/close', {
        method : 'POST',
        body   : JSON.stringify(close)
      })

      expect(resp.status).to.equal(202)

      expect(callbackSpy.calledOnce).to.be.true
      expect(callbackSpy.firstCall.lastArg).to.deep.eq(close)
    })

    xit('returns error if the callback throws a CallbackError', async () => {})
  })
})