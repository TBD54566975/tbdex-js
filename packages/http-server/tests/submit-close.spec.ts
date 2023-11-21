import type { ErrorResponse } from '@tbdex/http-client'
import type { Server } from 'http'

import { Close, DevTools, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'

let api = new TbdexHttpServer()
let server: Server
const did = await DevTools.createDid()
const { privateKeyJwk } = did.keySet.verificationMethodKeys[0]
const kid = did.document.verificationMethod[0].id

describe('POST /exchanges/:exchangeId/close', () => {
  before(() => {
    server = api.listen(8000)
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

    const responseBody = await resp.json() as ErrorResponse
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

    const responseBody = await resp.json() as ErrorResponse
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('not valid JSON')
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
    await close.sign(privateKeyJwk, kid)
    const resp = await fetch('http://localhost:8000/exchanges/123/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(404)

    const responseBody = await resp.json() as ErrorResponse
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('is undefined')
  })

  xit(`returns a 409 if close is not allowed based on the exchange's current state`, async () => {
    // add a close message
    const close = Close.create({
      metadata: {
        from       : did.did,
        to         : did.did,
        exchangeId : '123'
      },
      data: {}
    })
    await close.sign(privateKeyJwk, kid)
    const resp = await fetch('http://localhost:8000/exchanges/123/close', {
      method : 'POST',
      body   : JSON.stringify(close)
    })

    expect(resp.status).to.equal(409)
  })

  xit('returns a 400 if request body is not a valid Close')
  xit('returns a 400 if request body if integrity check fails')
  xit(`returns a 202 if close is accepted`)
})