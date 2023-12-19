import { expect } from 'chai'
import { DidDhtMethod, DidKeyMethod } from '@web5/dids'
import { TbdexHttpClient } from '../src/client.js'
import { RequestError,ResponseError, InvalidDidError, InvalidServiceEndpointError } from '../src/errors/index.js'
import { http, HttpResponse as MswHttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Message, Rfq } from '@tbdex/protocol'
import * as sinon from 'sinon'

// TODO: Introduce setupWorker for browser tests

const dhtDid = await DidDhtMethod.create({
  publish  : true,
  services : [{
    type            : 'PFI',
    id              : 'pfi',
    serviceEndpoint : 'https://localhost:9000'
  }]
})
const getPfiServiceEndpointStub = sinon.stub(TbdexHttpClient, 'getPfiServiceEndpoint').resolves('https://localhost:9000')
sinon.stub(Message, 'verify').resolves('123')

describe('client', () => {
  beforeEach(() => getPfiServiceEndpointStub.resolves('https://localhost:9000'))

  describe('sendMessage', async () => {
    const mockMessage = new Rfq({
      data: {
        offeringId    : '123',
        payinSubunits : '100',
        payinMethod   : {
          kind           : 'btc',
          paymentDetails : '123'
        },
        payoutMethod: {
          kind           : 'btc',
          paymentDetails : '123'
        }, claims: ['123']
      },
      metadata: {
        kind       : 'rfq',
        from       : 'did:key:321',
        to         : dhtDid.did,
        id         : '12345',
        exchangeId : '123',
        createdAt  : '1234567890'
      }
    })
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')

      try {
        await TbdexHttpClient.sendMessage({message: mockMessage})
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('Failed to send message')
        expect(e.cause).to.exist
        expect(e.cause.message).to.include('URL')
      }
    })

    it('throws ResponseError if response status is not ok', async () => {
      const server = setupServer(
        http.post('https://localhost:9000/exchanges/123/rfq', () => {
          return MswHttpResponse.json({}, {
            status: 400
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.sendMessage({message: mockMessage})
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal('https://localhost:9000/exchanges/123/rfq')
      }
      server.resetHandlers()
      server.close()
    })
    it('should not throw errors if all is well', async () => {
      const server = setupServer(
        http.post('https://localhost:9000/exchanges/123/rfq', () => {
          return MswHttpResponse.json({}, {
            status: 202
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.sendMessage({message: mockMessage})
      } catch (e) {
        expect.fail()
      }

      server.resetHandlers()
      server.close()
    })
  })
  describe('getOfferings', async () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      const server = setupServer(
        http.get('garbage/offerings', () => {
          return MswHttpResponse.json({}, {
            status: 404
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('Failed to get offerings')
        expect(e.cause).to.exist
        expect(e.cause.message).to.include('URL')
      }
      server.resetHandlers()
      server.close()
    })

    it('throws ResponseError if response status is not ok', async () => {
      const server = setupServer(
        http.get('https://localhost:9000/offerings', () => {
          return MswHttpResponse.json({}, {
            status: 400
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal('https://localhost:9000/offerings')
      }
      server.resetHandlers()
      server.close()
    })

    it('returns offerings array if response is ok', async () => {
      const server = setupServer(
        http.get('https://localhost:9000/offerings', () => {
          return MswHttpResponse.json({
            data: []
          }, {
            status: 202
          })
        }),
      )
      server.listen()

      const offerings = await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
      expect(offerings).to.have.length(0)

      server.resetHandlers()
      server.close()
    })
  })

  describe('getExchange', async () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      const server = setupServer(
        http.get('garbage/exchanges/123', () => {
          return MswHttpResponse.json({}, {
            status: 404
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getExchange({ pfiDid: dhtDid.did, exchangeId: '123', did: dhtDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('Failed to get exchange')
        expect(e.cause).to.exist
        expect(e.cause.message).to.include('URL')
      }
      server.resetHandlers()
      server.close()
    })

    it('throws ResponseError if response status is not ok', async () => {
      const server = setupServer(
        http.get('https://localhost:9000/exchanges/123', () => {
          return MswHttpResponse.json({}, {
            status: 400
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getExchange({ pfiDid: dhtDid.did, exchangeId: '123', did: dhtDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal('https://localhost:9000/exchanges/123')
      }
      server.resetHandlers()
      server.close()
    })

    it('returns exchange array if response is ok', async () => {
      const server = setupServer(
        http.get('https://localhost:9000/exchanges/123', () => {
          return MswHttpResponse.json({
            data: []
          }, {
            status: 202
          })
        }),
      )
      server.listen()

      const exchanges = await TbdexHttpClient.getExchange({ pfiDid: dhtDid.did, exchangeId: '123', did: dhtDid })
      expect(exchanges).to.have.length(0)

      server.resetHandlers()
      server.close()
    })
  })
  describe('getExchanges', async () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      const server = setupServer(
        http.get('garbage/exchanges', () => {
          return MswHttpResponse.json({}, {
            status: 404
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.did, did: dhtDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('Failed to get exchanges')
        expect(e.cause).to.exist
        expect(e.cause.message).to.include('URL')
      }
      server.resetHandlers()
      server.close()
    })

    it('throws ResponseError if response status is not ok', async () => {
      const server = setupServer(
        http.get('https://localhost:9000/exchanges', () => {
          return MswHttpResponse.json({}, {
            status: 400
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.did, did: dhtDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal('https://localhost:9000/exchanges')
      }
      server.resetHandlers()
      server.close()
    })

    it('returns exchanges array if response is ok', async () => {
      const server = setupServer(
        http.get('https://localhost:9000/exchanges', () => {
          return MswHttpResponse.json({
            data: []
          }, {
            status: 202
          })
        }),
      )
      server.listen()

      const exchanges = await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.did, did: dhtDid })
      expect(exchanges).to.have.length(0)

      server.resetHandlers()
      server.close()
    })
  })

  describe('getPfiServiceEndpoint', async () => {
    before(() => getPfiServiceEndpointStub.restore())

    it('throws InvalidDidError if did is pewpew', async () => {
      try {
        await TbdexHttpClient.getPfiServiceEndpoint('hehetroll')
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('InvalidDidError')
        expect(e).to.be.instanceof(InvalidDidError)
        expect(e.message).to.exist
      }
    })
    it('throws InvalidServiceEndpointError if did has no PFI service endpoint', async () => {
      const keyDid = await DidKeyMethod.create()
      try {
        await TbdexHttpClient.getPfiServiceEndpoint(keyDid.did)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('InvalidServiceEndpointError')
        expect(e).to.be.instanceof(InvalidServiceEndpointError)
        expect(e.message).to.include('has no PFI service entry')
      }
    })
    it('returns pfi service endpoint if all is well', async () => {
      const serviceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(dhtDid.did)
      expect(serviceEndpoint).to.equal('https://localhost:9000')
    })
  })
})

