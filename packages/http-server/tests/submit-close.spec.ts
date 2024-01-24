import type { ErrorDetail } from '@tbdex/http-client'
import type { Server } from 'http'

import { Close, DevTools, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { FakeExchangesApi } from '../src/fakes.js'

let api = new TbdexHttpServer()
let server: Server
const did = await DevTools.createDid()

describe('POST /exchanges/:exchangeId/close', () => {
  before(() => {
    server = api.listen(8000)
  })

  afterEach(() => {
    (api.exchangesApi as FakeExchangesApi).clearMessages()
  })

  after(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 400 if no request body is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123/close', {
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
    const resp = await fetch('http://localhost:8000/exchanges/123/close', {
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

  it(`returns a 404 if the exchange doesn't exist`, async () => {
    const close = Close.create({
      metadata: {
        from       : did.did,
        to         : did.did,
        exchangeId : '123'
      },
      data: {}
    })
    await close.sign(did)
    const resp = await fetch('http://localhost:8000/exchanges/123/close', {
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
    const close = Close.create({
      metadata: {
        from       : did.did,
        to         : did.did,
        exchangeId : '123'
      },
      data: {}
    })
    await close.sign(did)

    const exchangesApi = api.exchangesApi as FakeExchangesApi
    exchangesApi.addMessage(close)

    const close2 = Close.create({
      metadata: {
        from       : did.did,
        to         : did.did,
        exchangeId : '123'
      },
      data: {}
    })
    await close2.sign(did)
    const resp = await fetch('http://localhost:8000/exchanges/123/close', {
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

  xit('returns a 400 if request body is not a valid Close')
  xit('returns a 400 if request body if integrity check fails')
  xit(`returns a 202 if close is accepted`)
})