import { expect } from 'chai'
import { DidDhtMethod, DidKeyMethod } from '@web5/dids'
import { TbdexHttpClient } from '../src/client.js'
import { RequestError,ResponseError, InvalidDidError, MissingServiceEndpointError } from '../src/errors/index.js'
import { DevTools, Message, Order, Rfq } from '@tbdex/protocol'
import * as sinon from 'sinon'

const dhtDid = await DidDhtMethod.create({
  publish  : true,
  services : [{
    type            : 'PFI',
    id              : 'pfi',
    serviceEndpoint : 'https://localhost:9000'
  }]
})
const fetchStub = sinon.stub(globalThis, 'fetch')
const getPfiServiceEndpointStub = sinon.stub(TbdexHttpClient, 'getPfiServiceEndpoint')
sinon.stub(Message, 'verify').resolves('123')

describe('client', () => {
  beforeEach(() => getPfiServiceEndpointStub.resolves('https://localhost:9000'))

  describe('sendMessage', async () => {
    let mockRfqMessage: Rfq

    beforeEach(async () => {
      mockRfqMessage = await DevTools.createRfq({ sender: dhtDid, receiver: dhtDid })
    })

    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.sendMessage({message: mockRfqMessage})
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
      fetchStub.resolves({
        ok     : false,
        status : 400,
        json   : () => Promise.resolve({
          detail: 'some error'
        })
      } as Response)

      try {
        await TbdexHttpClient.sendMessage({message: mockRfqMessage})
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal(`https://localhost:9000/exchanges/${mockRfqMessage.metadata.exchangeId}/rfq`)
      }
    })
    it('should not throw errors if all is well when sending RFQ with replyTo field', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      try {
        await TbdexHttpClient.sendMessage({message: mockRfqMessage, replyTo: 'https://tbdex.io/callback'})
      } catch (e) {
        expect.fail()
      }
    })
    it('should not throw errors if all is well when sending RFQ without replyTo field', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      try {
        await TbdexHttpClient.sendMessage({message: mockRfqMessage})
      } catch (e) {
        expect.fail()
      }
    })
    it('should throw errors when sending Order with replyTo field', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      let mockOrderMessage
      try {
        mockOrderMessage = Order.create({
          metadata: {
            from       : dhtDid.did,
            to         : dhtDid.did,
            exchangeId : 'rfq_123'
          }
        })
        await TbdexHttpClient.sendMessage({message: mockOrderMessage, replyTo: 'https://tbdex.io/callback'})
        expect.fail()
      } catch (e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.statusCode).to.not.exist
        expect(e.details).to.not.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal(`https://localhost:9000/exchanges/${mockOrderMessage.metadata.exchangeId}/order`)
      }
    })
  })

  describe('getOfferings', async () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

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
    })

    it('throws ResponseError if response status is not ok', async () => {
      fetchStub.resolves({
        ok     : false,
        status : 400,
        json   : () => Promise.resolve({
          detail: 'some error'
        })
      } as Response)

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
    })

    it('returns offerings array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const offerings = await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
      expect(offerings).to.have.length(0)
    })
  })

  describe('getExchange', async () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

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
    })

    it('throws ResponseError if response status is not ok', async () => {
      fetchStub.resolves({
        ok     : false,
        status : 400,
        json   : () => Promise.resolve({
          detail: 'some error'
        })
      } as Response)

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
    })

    it('returns exchange array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const exchanges = await TbdexHttpClient.getExchange({ pfiDid: dhtDid.did, exchangeId: '123', did: dhtDid })
      expect(exchanges).to.have.length(0)
    })
  })

  describe('getExchanges', async () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

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
    })

    it('throws ResponseError if response status is not ok', async () => {
      fetchStub.resolves({
        ok     : false,
        status : 400,
        json   : () => Promise.resolve({
          detail: 'some error'
        })
      } as Response)

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
    })

    it('returns exchanges array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const exchanges = await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.did, did: dhtDid })
      expect(exchanges).to.have.length(0)
    })
  })

  describe('getPfiServiceEndpoint', async () => {
    before(() => {
      getPfiServiceEndpointStub.restore()
      fetchStub.restore()
    })

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
    it('throws MissingServiceEndpointError if did has no PFI service endpoint', async () => {
      const keyDid = await DidKeyMethod.create()

      try {
        await TbdexHttpClient.getPfiServiceEndpoint(keyDid.did)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('MissingServiceEndpointError')
        expect(e).to.be.instanceof(MissingServiceEndpointError)
        expect(e.message).to.include('has no PFI service entry')
      }
    })
    it('returns pfi service endpoint if all is well', async () => {
      const serviceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(dhtDid.did)
      expect(serviceEndpoint).to.equal('https://localhost:9000')
    })
  })
})

