import { ErrorDetail, Message } from '@tbdex/http-client'
import type { Server } from 'http'

import { DevTools, Order, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { DidJwk } from '@web5/dids'


describe('POST /exchanges/:exchangeId', () => {
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

  it('returns a 400 if request body is not a valid json object', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123', {
      method : 'PUT',
      body   : '!@!#'
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('JSON')
  })

  it('returns a 400 if request body if integrity check fails', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : Message.generateId('rfq'),
      },
    })
    // deliberately omit await order.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges/123', {
      method : 'PUT',
      body   : JSON.stringify(order)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include( 'Request body was not a valid Order or Close message')
  })

  it('returns a 400 if request body is not a valid close or order object', async () => {
    const alice = await DidJwk.create()
    const rfq = await DevTools.createRfq({
      sender: alice
    })
    await rfq.sign(alice)
    const resp = await fetch(`http://localhost:8000/exchanges/${rfq.metadata.exchangeId}`, {
      method : 'PUT',
      body   : JSON.stringify(rfq)
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json()  as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Request body was not a valid Order or Close message')
  })
})