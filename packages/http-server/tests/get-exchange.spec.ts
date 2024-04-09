import type { Server } from 'http'
import Sinon, * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import chai from 'chai'

import { TbdexHttpServer, RequestContext } from '../src/main.js'
import { BearerDid, DidDht, DidJwk } from '@web5/dids'
import { expect } from 'chai'
import { InMemoryExchangesApi } from '../src/in-memory-exchanges-api.js'
import { DevTools, ErrorDetail, TbdexHttpClient } from '@tbdex/http-client'

chai.use(sinonChai)

describe('GET /exchanges', () => {
  let server: Server
  let api: TbdexHttpServer
  let alice: BearerDid
  let pfi: BearerDid

  beforeEach(async () => {
    alice = await DidJwk.create()
    pfi = await DidDht.create()
    api = new TbdexHttpServer({ pfiDid: pfi.uri })
    server = api.listen(8000)
  })

  afterEach(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 401 if no Authorization header is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123')

    expect(resp.ok).to.be.false
    expect(resp.status).to.equal(401)

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Authorization')
  })

  it('returns 401 if bearer token is missing from the Authorization header', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123', {
      headers: {
        'Authorization': 'Not well formatted token'
      }
    })

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Malformed Authorization header. Expected: Bearer TOKEN_HERE')
  })

  it('returns 401 if the bearer token is malformed in the Authorization header', async () => {
    const resp = await fetch('http://localhost:8000/exchanges/123', {
      headers: {
        'Authorization': 'Bearer MALFORMED'
      }
    })

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Malformed Authorization header')
  })

  it('returns 404 if no matching exchange is found', async () => {
    const rfq = await DevTools.createRfq({ sender: alice, receiver: pfi })

    // Deliberately omit rfq from ExchangesApi
    // (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: alice, pfiDid: api.pfiDid })
    const exchangeId = rfq.metadata.exchangeId
    const resp = await fetch(`http://localhost:8000/exchanges/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })

    expect(resp.status).to.eq(404)
  })

  it('returns 403 if exchange found does not belong to the DID in the requestToken', async () => {
    const rfq = await DevTools.createRfq({ sender: alice, receiver: pfi });
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const imposterAlice = await DidJwk.create()
    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: imposterAlice, pfiDid: api.pfiDid })
    const exchangeId = rfq.metadata.exchangeId
    const resp = await fetch(`http://localhost:8000/exchanges/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })

    expect(resp.status).to.eq(403)
  })

  it(`passes the exchangeId to ExchangesApi.getExchange`, async () => {
    const rfq = await DevTools.createRfq({ sender: alice, receiver: pfi });
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const exchangesApiSpy = sinon.spy(api.exchangesApi, 'getExchange')

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: alice, pfiDid: api.pfiDid })
    const exchangeId = rfq.metadata.exchangeId
    const resp = await fetch(`http://localhost:8000/exchanges/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })

    expect(resp.ok).to.be.true
    expect(exchangesApiSpy.calledOnce).to.be.true
    expect(exchangesApiSpy).to.have.been.calledWith({
      id: exchangeId,
    })

    exchangesApiSpy.restore()
  })

  it('calls the callback if it is provided', async () => {
    const rfq = await DevTools.createRfq({ sender: alice, receiver: pfi })
    await rfq.sign(alice);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const callbackSpy = Sinon.spy((_ctx: RequestContext) => Promise.resolve())
    api.onGetExchange(callbackSpy)

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: alice, pfiDid: api.pfiDid })

    const resp = await fetch(`http://localhost:8000/exchanges/${rfq.metadata.exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })
    expect(resp.status).to.equal(200)

    expect(callbackSpy.callCount).to.eq(1)
    // TODO: Check what arguments are passed to callback after we finalize its behavior
  })

  it(`returns Exchange.messages from ExchangesApi.getExchange`, async () => {
    const rfq = await DevTools.createRfq({ sender: alice, receiver: pfi })
    await rfq.sign(alice);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const exchangesApiSpy = sinon.spy(api.exchangesApi, 'getExchange')

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: alice, pfiDid: api.pfiDid })
    const exchangeId = rfq.metadata.exchangeId
    const resp = await fetch(`http://localhost:8000/exchanges/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })

    const data = await resp.json()
    const rfqJson = rfq.toJSON()
    expect(data).to.deep.equal({ data: [ rfqJson ] })

    exchangesApiSpy.restore()
  })
})