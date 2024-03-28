import { DevTools, Offering } from '@tbdex/protocol'
import type { Server } from 'http'

import { GetOfferingsFilter, RequestContext, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { InMemoryOfferingsApi } from '../src/in-memory-offerings-api.js'
import Sinon from 'sinon'
import { DidJwk } from '@web5/dids'

describe('GET /offerings', () => {
  let api: TbdexHttpServer
  let server: Server

  beforeEach(() => {
    api =  new TbdexHttpServer()
    server = api.listen(8000)
  })

  afterEach(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns an array of offerings', async () => {
    const pfiDid = await DidJwk.create()
    const offering = DevTools.createOffering()
    await offering.sign(pfiDid);
    (api.offeringsApi as InMemoryOfferingsApi).addOffering(offering)

    const response = await fetch('http://localhost:8000/offerings')
    expect(response.status).to.equal(200)

    const responseBody = await response.json() as { data: Offering[] }
    expect(responseBody.data).to.exist
    expect(responseBody.data.length).to.equal(1)
    expect(responseBody.data[0]).to.deep.eq(offering.toJSON())
  })

  it('constructs the filter from query params and passes it to OfferingsApi', async () => {
    const pfiDid = await DidJwk.create()

    // Add an offering to OfferingsApi
    const offering = DevTools.createOffering()
    await offering.sign(pfiDid);
    (api.offeringsApi as InMemoryOfferingsApi).addOffering(offering)

    // Set up spy
    const exchangesApiSpy = Sinon.spy(api.offeringsApi, 'getOfferings')

    // Specify query params
    const queryParams: GetOfferingsFilter = {
      id             : offering.metadata.id,
      payinCurrency  : offering.data.payin.currencyCode,
      payoutCurrency : offering.data.payout.currencyCode
    }
    const queryParamsString: string =
      Object.entries(queryParams)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')


    const response = await fetch(`http://localhost:8000/offerings?${queryParamsString}`)

    expect(response.status).to.equal(200)

    expect(exchangesApiSpy.calledOnce).to.be.true
    expect(exchangesApiSpy.firstCall.args[0]?.filter).to.deep.eq(queryParams)
  })

  it('calls the callback if it is provided', async () => {
    const pfiDid = await DidJwk.create()
    const offering = DevTools.createOffering()
    await offering.sign(pfiDid);
    (api.offeringsApi as InMemoryOfferingsApi).addOffering(offering)

    const callbackSpy = Sinon.spy((_ctx: RequestContext, _filter: GetOfferingsFilter) => Promise.resolve())
    api.onGetOfferings(callbackSpy)

    const response = await fetch('http://localhost:8000/offerings?filter=')
    expect(response.status).to.equal(200)

    expect(callbackSpy.callCount).to.eq(1)
    // TODO: Check what arguments are passed to callback after we finalize its behavior
  })
})