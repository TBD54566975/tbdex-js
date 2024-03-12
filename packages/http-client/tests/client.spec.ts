import { expect } from 'chai'
import { DidDht, DidJwk, BearerDid } from '@web5/dids'
import { TbdexHttpClient, requestTokenRequiredClaims } from '../src/client.js'
import {
  RequestError,ResponseError,
  InvalidDidError,
  MissingServiceEndpointError,
  RequestTokenMissingClaimsError,
  RequestTokenAudienceMismatchError,
  RequestTokenVerificationError,
  RequestTokenSigningError,
  RequestTokenIssuerSignerMismatchError
} from '../src/errors/index.js'
import { DevTools } from '@tbdex/protocol'
import * as sinon from 'sinon'
import { JwtHeaderParams, JwtPayload } from '@web5/crypto'
import { Convert } from '@web5/common'
import { Jwt } from '@web5/credentials'
import { Order } from '@tbdex/protocol'
import { Message } from '@tbdex/protocol'
import { Close } from '@tbdex/protocol'

const pfiDid: BearerDid = await DidDht.create({
  options: {
    services: [{
      type            : 'PFI',
      id              : 'pfi',
      serviceEndpoint : 'https://localhost:9000'
    }]
  }
})

const aliceDid: BearerDid = await DidJwk.create()

// TODO : Instead of stubbing fetch, consider using libraries like msw
const fetchStub = sinon.stub(globalThis, 'fetch')
const getPfiServiceEndpointStub = sinon.stub(TbdexHttpClient, 'getPfiServiceEndpoint')

describe('client', () => {
  beforeEach(() => getPfiServiceEndpointStub.resolves('https://localhost:9000'))

  describe('createExchange', () => {
    it('throws RequestError if the service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.createExchange(rfq)
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

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.createExchange(rfq)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(pfiDid.uri)
        expect(e.url).to.equal(`https://localhost:9000/exchanges/${rfq.metadata.exchangeId}/rfq`)
      }
    })

    it('submits an RFQ without replyTo', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.createExchange(rfq)
      } catch (e) {
        expect.fail()
      }
    })

    it('submits an RFQ with replyTo', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.createExchange(rfq, { replyTo: 'https://example.com'})
      } catch (e) {
        expect.fail()
      }
    })
  })

  describe('submitOrder', () => {
    it('throws RequestError if the service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      const order = Order.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : Message.generateId('rfq'),
        }
      })
      await order.sign(aliceDid)

      try {
        await TbdexHttpClient.submitOrder(order)
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

      const order = Order.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : Message.generateId('rfq'),
        }
      })
      await order.sign(aliceDid)

      try {
        await TbdexHttpClient.submitOrder(order)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(pfiDid.uri)
        expect(e.url).to.equal(`https://localhost:9000/exchanges/${order.metadata.exchangeId}/order`)
      }
    })

    it('submits an Order', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      const order = Order.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : Message.generateId('rfq'),
        }
      })
      await order.sign(aliceDid)

      try {
        await TbdexHttpClient.submitOrder(order)
      } catch (e) {
        expect.fail()
      }
    })
  })

  describe('submitClose', () => {
    it('throws RequestError if the service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      const close = Close.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : Message.generateId('rfq'),
        },
        data: {
          reason: 'Closed for the day. Gone fishin'
        }
      })
      await close.sign(aliceDid)

      try {
        await TbdexHttpClient.submitClose(close)
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

      const close = Close.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : Message.generateId('rfq'),
        },
        data: {
          reason: 'Closed for the day. Gone fishin'
        }
      })
      await close.sign(aliceDid)

      try {
        await TbdexHttpClient.submitClose(close)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(pfiDid.uri)
        expect(e.url).to.equal(`https://localhost:9000/exchanges/${close.metadata.exchangeId}/close`)
      }
    })

    it('submits a Close', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      const close = Close.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : Message.generateId('rfq'),
        },
        data: {
          reason: 'Closed for the day. Gone fishin'
        }
      })
      await close.sign(aliceDid)

      try {
        await TbdexHttpClient.submitClose(close)
      } catch (e) {
        expect.fail()
      }
    })
  })

  describe('getOfferings', () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.getOfferings({ pfiDid: pfiDid.uri })
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
        await TbdexHttpClient.getOfferings({ pfiDid: pfiDid.uri })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(pfiDid.uri)
        expect(e.url).to.equal('https://localhost:9000/offerings')
      }
    })

    it('returns offerings array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const offerings = await TbdexHttpClient.getOfferings({ pfiDid: pfiDid.uri })
      expect(offerings).to.have.length(0)
    })
  })

  describe('getExchange', () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.getExchange({ pfiDid: pfiDid.uri, exchangeId: '123', did: pfiDid })
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
        await TbdexHttpClient.getExchange({ pfiDid: pfiDid.uri, exchangeId: '123', did: pfiDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(pfiDid.uri)
        expect(e.url).to.equal('https://localhost:9000/exchanges/123')
      }
    })

    it('returns exchange array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const exchanges = await TbdexHttpClient.getExchange({ pfiDid: pfiDid.uri, exchangeId: '123', did: pfiDid })
      expect(exchanges).to.have.length(0)
    })
  })

  describe('getExchanges', () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.getExchanges({ pfiDid: pfiDid.uri, did: pfiDid })
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
        await TbdexHttpClient.getExchanges({ pfiDid: pfiDid.uri, did: pfiDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(pfiDid.uri)
        expect(e.url).to.equal('https://localhost:9000/exchanges')
      }
    })

    it('returns empty exchanges array if response is ok and body is empty array', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const exchanges = await TbdexHttpClient.getExchanges({ pfiDid: pfiDid.uri, did: pfiDid })
      expect(exchanges).to.have.length(0)
    })
  })

  describe('getPfiServiceEndpoint', () => {
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
      try {
        await TbdexHttpClient.getPfiServiceEndpoint(aliceDid.uri)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('MissingServiceEndpointError')
        expect(e).to.be.instanceof(MissingServiceEndpointError)
        expect(e.message).to.include('has no PFI service entry')
      }
    })
    it('returns pfi service endpoint if all is well', async () => {
      const serviceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid.uri)
      expect(serviceEndpoint).to.equal('https://localhost:9000')
    })
  })

  describe('generateRequestToken', () => {
    let requesterBearerDid: BearerDid
    before(async () => {
      requesterBearerDid = await DidJwk.create()
    })
    it('includes all expected claims', async () => {
      const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: requesterBearerDid, pfiDid: 'did:key:1234' })
      const decodedToken = await Jwt.verify({ jwt: requestToken })
      expect(decodedToken.payload).to.have.all.keys(requestTokenRequiredClaims)
    })
    // TODO: decide if we want to ensure that the expiration date is not longer than 1 minute after the issuance date
    it('sets expiration seconds to 1 minute after the time at which it was issued', async () => {
      const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: requesterBearerDid, pfiDid: 'did:key:1234' })
      const decodedToken = await Jwt.verify({ jwt: requestToken })
      expect(decodedToken.payload.exp! - decodedToken.payload.iat!).to.equal(60)
    })
  })

  describe('verifyRequestToken', () => {
    let pfiBearerDid: BearerDid
    let aliceBearerDid: BearerDid
    let header: JwtHeaderParams
    let payload: JwtPayload

    /*
    ** helper function to help alice generate a valid request token to send to a pfi
    */
    async function createAndSignRequestToken(payload: JwtPayload) {
      const signer = await aliceBearerDid.getSigner()
      header = { typ: 'JWT', alg: signer.algorithm, kid: signer.keyId }
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url()
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url()

      const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`
      const toSignBytes = Convert.string(toSign).toUint8Array()
      const signatureBytes = await signer.sign({ data: toSignBytes })
      const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url()

      return `${toSign}.${base64UrlEncodedSignature}`
    }

    before(async () => {
      pfiBearerDid = await DidDht.create()
      aliceBearerDid = await DidDht.create()
      header = { typ: 'JWT', alg: 'ES256K', kid: aliceBearerDid.document.verificationMethod![0].id }
    })

    beforeEach(() => {
      payload = {
        iat : Math.floor(Date.now() / 1000),
        aud : pfiBearerDid.uri,
        iss : aliceBearerDid.uri,
        exp : Math.floor(Date.now() / 1000 + 60),
        jti : 'randomnonce'
      }
    })

    it('throws a RequestTokenSigningError if token cannot be signed', async () => {
      const jwtSigner = sinon.stub(Jwt, 'sign')
      jwtSigner.throws()
      try {
        await TbdexHttpClient.generateRequestToken({ requesterDid: aliceBearerDid, pfiDid: ''})
        expect.fail()
      } catch (e) {
        expect(e).to.be.instanceOf(RequestTokenSigningError)
      }
      jwtSigner.restore()
    })

    it('throws RequestTokenVerificationError if request token is not a valid jwt', async () => {
      try {
        await TbdexHttpClient.verifyRequestToken({ requestToken: '', pfiDid: pfiBearerDid.uri })
        expect.fail()
      } catch(e) {
        expect(e).to.be.instanceof(RequestTokenVerificationError)
      }
    })
    it('throws RequestTokenMissingClaimsError if request token is missing any of the expected claims', async () => {
      for (const claim of requestTokenRequiredClaims) {
        const initialClaim = payload[claim]
        try {
          delete payload[claim]
          const requestToken = await createAndSignRequestToken(payload)
          await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiBearerDid.uri })
          expect.fail()
        } catch(e) {
          expect(e).to.be.instanceof(RequestTokenMissingClaimsError)
          expect(e.message).to.include(`Request token missing ${claim} claim.`)
        }
        payload[claim] = initialClaim
      }
    })
    it('throws RequestTokenAudienceMismatchError if aud claim does not match pfi did', async () => {
      try {
        payload.aud = 'squirtle'
        const requestToken = await createAndSignRequestToken(payload)
        await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiBearerDid.uri })
        expect.fail()
      } catch(e) {
        expect(e).to.be.instanceof(RequestTokenAudienceMismatchError)
        expect(e.message).to.include('Request token contains invalid audience')
      }
    })
    it('throws RequestTokenIssuerSignerMismatchError if iss claim does not match kid header', async () => {
      try {
        const bobBearerDid = await DidDht.create()
        payload.iss = bobBearerDid.uri
        const requestToken = await createAndSignRequestToken(payload)
        await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiBearerDid.uri })
        expect.fail()
      } catch(e) {
        expect(e).to.be.instanceof(RequestTokenIssuerSignerMismatchError)
        expect(e.message).to.include('Request token issuer does not match signer')
      }
    })
    it('returns requester\'s DID if request token is valid', async () => {
      const requestToken = await createAndSignRequestToken(payload)
      const iss = await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiBearerDid.uri })
      expect(iss).to.equal(aliceBearerDid.uri)
    })
  })
})