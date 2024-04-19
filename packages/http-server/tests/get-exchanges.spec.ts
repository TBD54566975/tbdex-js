import type { Server } from 'http'
import Sinon, * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import chai from 'chai'

import { TbdexHttpServer, RequestContext, GetExchangesFilter } from '../src/main.js'
import { DidJwk } from '@web5/dids'
import { expect } from 'chai'
import { InMemoryExchangesApi } from '../src/in-memory-exchanges-api.js'
import { DevTools, ErrorDetail, TbdexHttpClient } from '@tbdex/http-client'

chai.use(sinonChai)

describe('GET /exchanges', () => {
  let server: Server
  let api: TbdexHttpServer

  beforeEach(() => {
    api = new TbdexHttpServer()
    server = api.listen(8000)
  })

  afterEach(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 401 if no Authorization header is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges')

    expect(resp.ok).to.be.false
    expect(resp.status).to.equal(401)

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Authorization')
  })

  it('returns 401 if bearer token is missing from the Authorization header', async () => {
    const resp = await fetch('http://localhost:8000/exchanges', {
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
    const resp = await fetch('http://localhost:8000/exchanges', {
      headers: {
        'Authorization': 'Bearer MALFORMED'
      }
    })

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Malformed Authorization header')
  })

  describe('Passes filter to ExchangesApi.getExchanges', () => {
    it(`passes the requester's did to the filter of ExchangesApi.getExchanges`, async () => {
      const alice = await DidJwk.create()

      const exchangesApiSpy = sinon.spy(api.exchangesApi, 'getExchanges')

      const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: alice, pfiDid: api.pfiDid })
      const resp = await fetch('http://localhost:8000/exchanges', {
        headers: {
          'Authorization': `Bearer ${requestToken}`
        }
      })

      expect(resp.ok).to.be.true
      expect(exchangesApiSpy.calledOnce).to.be.true
      expect(exchangesApiSpy).to.have.been.calledWith({
        filter: {
          from: alice.uri
        }
      })

      exchangesApiSpy.restore()
    })
  })

  it('calls the callback if it is provided', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()
    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    await rfq.sign(aliceDid);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const callbackSpy = Sinon.spy((_ctx: RequestContext, _filter: GetExchangesFilter) => Promise.resolve())
    api.onGetExchanges(callbackSpy)

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: aliceDid, pfiDid: api.pfiDid })

    const resp = await fetch(`http://localhost:8000/exchanges`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })
    expect(resp.status).to.equal(200)

    expect(callbackSpy.callCount).to.eq(1)
    // TODO: Check what arguments are passed to callback after we finalize its behavior
  })

  it(`returns an array of Exchange.messages from ExchangesApi.getExchanges`, async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()
    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    await rfq.sign(aliceDid);
    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const exchangesApiSpy = sinon.spy(api.exchangesApi, 'getExchanges')

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: aliceDid, pfiDid: api.pfiDid })
    const resp = await fetch(`http://localhost:8000/exchanges`, {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })

    const data: any = await resp.json()
    const rfqJson = rfq.toJSON()
    expect(data).to.deep.equal({ data: [[ rfqJson ]] })

    exchangesApiSpy.restore()
  })
})