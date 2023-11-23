import type { ExchangesApi, GetExchangesFilter } from '../src/main.js'
import type { Server } from 'http'

import { TbdexHttpServer, MessageKindClass, Rfq, Quote, Order, OrderStatus, Close, TbdexHttpClient } from '../src/main.js'
import { DidKeyMethod } from '@web5/dids'
import { expect } from 'chai'

let api = new TbdexHttpServer()
let server: Server

describe('GET /exchanges', () => {
  before(() => {
    server = api.listen(8000)
  })

  after(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns a 401 if no Authorization header is provided', async () => {
    const resp = await fetch('http://localhost:8000/exchanges')

    expect(resp.ok).to.be.false
    expect(resp.status).to.equal(401)

    const respBody = await resp.json()
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Authorization')
  })

  it(`passes the requester's did to getExchanges method`, async () => {
    let functionReached = false
    const alice = await DidKeyMethod.create()

    const exchangesApi: ExchangesApi = {
      getExchanges: async function (opts: { filter: GetExchangesFilter }): Promise<MessageKindClass[][]> {
        functionReached = true
        expect(opts.filter.from).to.exist
        expect(opts.filter.from).to.equal(alice.did)

        return []
      },
      getExchange: function (): Promise<MessageKindClass[]> {
        throw new Error('Function not implemented.')
      },
      getRfq: function (): Promise<Rfq> {
        throw new Error('Function not implemented.')
      },
      getQuote: function (): Promise<Quote> {
        throw new Error('Function not implemented.')
      },
      getOrder: function (): Promise<Order> {
        throw new Error('Function not implemented.')
      },
      getOrderStatuses: function (): Promise<OrderStatus[]> {
        throw new Error('Function not implemented.')
      },
      getClose: function (): Promise<Close> {
        throw new Error('Function not implemented.')
      }
    }

    const testApi = new TbdexHttpServer({ exchangesApi })
    const server = testApi.listen(8001)

    const requestToken = await TbdexHttpClient.generateRequestToken(alice.keySet.verificationMethodKeys[0].privateKeyJwk, alice.document.verificationMethod[0].id)
    const resp = await fetch('http://localhost:8001/exchanges', {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })

    expect(resp.ok).to.be.true
    expect(functionReached).to.be.true

    server.closeAllConnections()
  })
})