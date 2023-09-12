import type { ErrorResponse } from '@tbdex/http-client'
import type { Server } from 'http'

import { TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'

let api = new TbdexHttpServer()
let server: Server

describe('POST /exchanges/:exchangeId/order', () => {
  before(() => {
    server = api.listen(8000)
  })

  after(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 400 if no request body is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
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
    const resp = await fetch('http://localhost:8000/exchanges/123/order', {
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

  xit('returns a 400 if request body is not a valid Order')
  xit('returns a 400 if request body if integrity check fails')
  xit('returns a 404 exchange doesnt exist')
  xit(`returns a 409 if order is not allowed based on the exchange's current state`)
  xit(`returns a 400 if order is quote has expired`)
  xit(`returns a 202 if order is accepted`)
})