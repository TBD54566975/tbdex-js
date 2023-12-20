import type { ErrorDetail } from '@tbdex/http-client'
import type { Server } from 'http'

import { TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'

let api = new TbdexHttpServer()
let server: Server

describe('POST /exchanges/:exchangeId/rfq', () => {
  before(() => {
    server = api.listen(8000)
  })

  after(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 400 if no request body is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123/rfq', {
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
    const resp = await fetch('http://localhost:8000/exchanges/123/rfq', {
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

  xit('returns a 400 if request body is not a valid RFQ')
  xit('returns a 400 if request body if integrity check fails')
  xit('returns a 409 if request body if RFQ already exists')
  xit('returns a 400 if request body if offering doesnt exist')
  xit(`returns a 400 if request body if RFQ does not fulfill offering's requirements`)
  xit(`returns a 202 if RFQ is accepted`)
})