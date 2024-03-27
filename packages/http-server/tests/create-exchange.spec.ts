import { ErrorDetail, Offering, Order, Rfq } from '@tbdex/http-client'
import type { Server } from 'http'

import { DevTools, RequestContext, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { InMemoryExchangesApi } from '../src/in-memory-exchanges-api.js'
import { InMemoryOfferingsApi } from '../src/in-memory-offerings-api.js'
import { BearerDid, DidDht, DidJwk } from '@web5/dids'
import Sinon from 'sinon'
import { Message } from '@tbdex/protocol'

describe('POST /exchanges/:exchangeId/rfq', () => {
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
    const resp = await fetch('http://localhost:8000/exchanges', {
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
    const resp = await fetch('http://localhost:8000/exchanges', {
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

  it('returns a 400 if create exchange request contains a replyTo which is not a valid URL', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidDht.create()
    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    await rfq.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges', {
      method : 'POST',
      body   : JSON.stringify({ rfq: rfq, replyTo: 'foo' })
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('replyTo must be a valid url')
  })

  it('returns a 400 if request body is not a valid RFQ', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : Message.generateId('rfq')
      }
    })
    await order.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges', {
      method : 'POST',
      body   : JSON.stringify({ rfq: order })
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Parsing of TBDex Rfq message failed')
  })

  it('returns a 400 if request body if integrity check fails', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    // deliberately omit rfq.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges', {
      method : 'POST',
      body   : JSON.stringify({ rfq })
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Parsing of TBDex Rfq message failed')
  })

  it('returns a 409 if request body if RFQ already exists', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    await rfq.sign(aliceDid);

    (api.exchangesApi as InMemoryExchangesApi).addMessage(rfq)

    const resp = await fetch('http://localhost:8000/exchanges', {
      method : 'POST',
      body   : JSON.stringify({ rfq })
    })

    expect(resp.status).to.equal(409)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('already exists')
  })

  it('returns a 400 if request body if offering doesnt exist', async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    const offering = DevTools.createOffering()
    // deliberately omit (api.offeringsApi as InMemoryOfferingsApi).addOffering(offering)
    const rfq = Rfq.create({
      metadata: {
        from : aliceDid.uri,
        to   : pfiDid.uri,
      },
      data: {
        ...await DevTools.createRfqData(),
        offeringId: offering.metadata.id,
      },
    })
    await rfq.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges', {
      method : 'POST',
      body   : JSON.stringify({ rfq })
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include(`offering ${offering.metadata.id} does not exist`)
  })

  it(`returns a 400 if request body if RFQ does not fulfill offering's requirements`, async () => {
    const aliceDid = await DidJwk.create()
    const pfiDid = await DidJwk.create()

    // Add offering to api.offeringsApi
    const offering = DevTools.createOffering()
    await offering.sign(pfiDid);
    (api.offeringsApi as InMemoryOfferingsApi).addOffering(offering)

    // Create Rfq which doesn't contain the required claims
    const rfq = Rfq.create({
      metadata: {
        from : aliceDid.uri,
        to   : pfiDid.uri,
      },
      data: {
        ...await DevTools.createRfqData(),
        offeringId : offering.metadata.id,
        claims     : [],
      },
    })
    await rfq.sign(aliceDid)

    const resp = await fetch('http://localhost:8000/exchanges', {
      method : 'POST',
      body   : JSON.stringify({ rfq })
    })

    expect(resp.status).to.equal(400)

    const responseBody = await resp.json() as { errors: ErrorDetail[] }
    expect(responseBody.errors.length).to.equal(1)

    const [ error ] = responseBody.errors
    expect(error.detail).to.exist
    expect(error.detail).to.include('Failed to verify offering requirements')
  })

  describe('RFQ satisfies all requirements', () => {
    let aliceDid: BearerDid
    let pfiDid: BearerDid
    let offering: Offering
    let rfq: Rfq

    beforeEach(async () => {
      aliceDid = await DidJwk.create()
      pfiDid = await DidJwk.create()

      // Add offering with no required claims to api.offeringsApi
      offering = Offering.create({
        metadata: {
          from: pfiDid.uri,
        },
        data: {
          ...DevTools.createOfferingData(),
          requiredClaims : undefined,
          payin          : {
            currencyCode : 'BTC',
            min          : '1000.0',
            methods      : [{
              kind                   : 'BTC_ADDRESS',
              requiredPaymentDetails : {
                $schema    : 'http://json-schema.org/draft-07/schema',
                type       : 'object',
                properties : {
                  btcAddress: {
                    type        : 'string',
                    description : 'your Bitcoin wallet address'
                  }
                },
                required             : ['btcAddress'],
                additionalProperties : false
              }
            }]
          },
          payout: {
            currencyCode : 'BTC',
            min          : '1000.0',
            methods      : [{
              kind                   : 'BTC_ADDRESS',
              requiredPaymentDetails : {
                $schema    : 'http://json-schema.org/draft-07/schema',
                type       : 'object',
                properties : {
                  btcAddress: {
                    type        : 'string',
                    description : 'your Bitcoin wallet address'
                  }
                },
                required             : ['btcAddress'],
                additionalProperties : false
              },
              estimatedSettlementTime: 10, // seconds
            }]
          },
        },
      })
      await offering.sign(pfiDid);
      (api.offeringsApi as InMemoryOfferingsApi).addOffering(offering)

      // Create Rfq which satisfies Offering requirements
      rfq = Rfq.create({
        metadata: {
          from : aliceDid.uri,
          to   : pfiDid.uri,
        },
        data: {
          ...DevTools.createRfqData(),
          offeringId : offering.metadata.id,
          claims     : [],
          payin      : {
            kind           : offering.data.payin.methods[0].kind,
            paymentDetails : {
              btcAddress: '1234',
            },
            amount: offering.data.payin.min!,
          },
          payout: {
            kind           : offering.data.payout.methods[0].kind,
            paymentDetails : {
              btcAddress: '1234',
            }
          }
        }
      })
      await rfq.sign(aliceDid)
    })

    it('returns a 202 if RFQ is accepted', async () => {
      const resp = await fetch('http://localhost:8000/exchanges', {
        method : 'POST',
        body   : JSON.stringify({ rfq })
      })

      expect(resp.status).to.equal(202)
    })

    it('returns a 202 if the provided callback succeeds and passes correct arguments to callback', async () => {
      const callbackSpy = Sinon.spy(
        (_ctx: RequestContext, _message: Rfq, _opts: { offering: Offering, replyTo?: string }) => {
          return Promise.resolve()
        })
      api.onCreateExchange(callbackSpy)

      const resp = await fetch('http://localhost:8000/exchanges', {
        method : 'POST',
        body   : JSON.stringify({ rfq })
      })

      expect(resp.status).to.equal(202)

      expect(callbackSpy.callCount).to.eq(1)
      expect(callbackSpy.firstCall.args.length).to.eq(3)

      expect(callbackSpy.firstCall.args.at(1)).to.deep.eq(rfq)
      const lastCallbackArg = callbackSpy.firstCall.args.at(2) as { offering: Offering, replyTo?: string }
      expect(lastCallbackArg.offering).to.deep.eq(offering)
      expect(lastCallbackArg.replyTo).to.be.undefined
    })

    it('passes replyTo to the callback if it is provided in the request', async () => {
      const callbackSpy = Sinon.spy(
        (_ctx: RequestContext, _message: Rfq, _opts: { offering: Offering, replyTo?: string }) =>{
          return Promise.resolve()
        })
      api.onCreateExchange(callbackSpy)

      const replyTo = 'https://tbdex.io/example'

      const resp = await fetch('http://localhost:8000/exchanges', {
        method : 'POST',
        body   : JSON.stringify({ rfq, replyTo })
      })

      expect(resp.status).to.equal(202)

      expect(callbackSpy.callCount).to.eq(1)
      expect(callbackSpy.firstCall.args.length).to.eq(3)

      expect(callbackSpy.firstCall.args.at(1)).to.deep.eq(rfq)
      const lastCallbackArg = callbackSpy.firstCall.args.at(2) as { offering: Offering, replyTo?: string }
      expect(lastCallbackArg.offering).to.deep.eq(offering)
      expect(lastCallbackArg.replyTo).to.eq(replyTo)
    })

    xit('creates the filter for OfferingsApi if it is provided in the request')
  })
})