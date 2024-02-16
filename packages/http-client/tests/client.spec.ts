import { expect } from 'chai'
import { DidDht, DidKey, BearerDid } from '@web5/dids'
import { TbdexHttpClient, requestTokenRequiredClaims } from '../src/client.js'
import {
  RequestError,ResponseError,
  InvalidDidError,
  MissingServiceEndpointError,
  RequestTokenMissingClaimsError,
  RequestTokenAudienceMismatchError,
  RequestTokenVerificationError,
  RequestTokenSigningError
} from '../src/errors/index.js'
import { DevTools } from '@tbdex/protocol'
import * as sinon from 'sinon'
import { JwtHeaderParams, JwtPayload } from '@web5/crypto'
import { Convert } from '@web5/common'
import { Jwt } from '@web5/credentials'

const dhtDid = await DidDht.create({
  options: {
    services: [{
      type            : 'PFI',
      id              : 'pfi',
      serviceEndpoint : 'https://localhost:9000'
    }]
  }
})

// TODO : Instead of stubbing fetch, consider using libraries like msw
const fetchStub = sinon.stub(globalThis, 'fetch')
const getPfiServiceEndpointStub = sinon.stub(TbdexHttpClient, 'getPfiServiceEndpoint')

describe('client', () => {
  beforeEach(() => getPfiServiceEndpointStub.resolves('https://localhost:9000'))

  describe('sendMessage', () => {
    let aliceDid: BearerDid
    let pfiDid: BearerDid

    beforeEach(async () => {
      aliceDid = await DevTools.createDid()
      pfiDid = await DevTools.createDid()
    })

    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.sendMessage({ message: rfq })
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
        await TbdexHttpClient.sendMessage({message: rfq })
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

    it('should not throw errors if all is well when sending RFQ with replyTo field', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.sendMessage({message: rfq, replyTo: 'https://tbdex.io/callback'})
      } catch (e) {
        expect.fail()
      }
    })

    it('should not throw errors if all is well when sending RFQ without replyTo field', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
      await rfq.sign(aliceDid)

      try {
        await TbdexHttpClient.sendMessage({ message: rfq })
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
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.uri })
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
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.uri })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.uri)
        expect(e.url).to.equal('https://localhost:9000/offerings')
      }
    })

    it('returns offerings array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const offerings = await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.uri })
      expect(offerings).to.have.length(0)
    })
  })

  describe('getExchange', () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.getExchange({ pfiDid: dhtDid.uri, exchangeId: '123', did: dhtDid })
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
        await TbdexHttpClient.getExchange({ pfiDid: dhtDid.uri, exchangeId: '123', did: dhtDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.uri)
        expect(e.url).to.equal('https://localhost:9000/exchanges/123')
      }
    })

    it('returns exchange array if response is ok', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const exchanges = await TbdexHttpClient.getExchange({ pfiDid: dhtDid.uri, exchangeId: '123', did: dhtDid })
      expect(exchanges).to.have.length(0)
    })
  })

  describe('getExchanges', () => {
    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.uri, did: dhtDid })
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
        await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.uri, did: dhtDid })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.uri)
        expect(e.url).to.equal('https://localhost:9000/exchanges')
      }
    })

    it('returns empty exchanges array if response is ok and body is empty array', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve({ data: [] })
      } as Response)

      const exchanges = await TbdexHttpClient.getExchanges({ pfiDid: dhtDid.uri, did: dhtDid })
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
      const keyDid = await DidKey.create()

      try {
        await TbdexHttpClient.getPfiServiceEndpoint(keyDid.uri)
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('MissingServiceEndpointError')
        expect(e).to.be.instanceof(MissingServiceEndpointError)
        expect(e.message).to.include('has no PFI service entry')
      }
    })
    it('returns pfi service endpoint if all is well', async () => {
      const serviceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(dhtDid.uri)
      expect(serviceEndpoint).to.equal('https://localhost:9000')
    })
  })

  describe('generateRequestToken', () => {
    let requesterBearerDid: BearerDid
    before(async () => {
      requesterBearerDid = await DidKey.create({options: { algorithm: 'secp256k1' }})
    })
    it('throws a RequestTokenSigningError if requesterDid is not a valid BearerDid', async () => {
      try {
        await TbdexHttpClient.generateRequestToken({ requesterDid: {
          uri        : '',
          metadata   : {},
          document   : { id: '' },
          keyManager : requesterBearerDid.keyManager,
          export     : requesterBearerDid.export,
          getSigner  : requesterBearerDid.getSigner
        }, pfiDid: ''})
        expect.fail()
      } catch (e) {
        expect(e).to.be.instanceOf(RequestTokenSigningError)
      }
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
    let header: JwtHeaderParams
    let payload: JwtPayload

    async function createRequestTokenFromPayload(payload: JwtPayload) {
      const signer = await pfiBearerDid.getSigner()
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url()
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url()

      const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`
      const toSignBytes = Convert.string(toSign).toUint8Array()
      const signatureBytes = await signer.sign({ data: toSignBytes })
      const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url()

      return `${toSign}.${base64UrlEncodedSignature}`
    }

    before(async () => {
      pfiBearerDid = await DidKey.create({ options: { algorithm: 'secp256k1' }})
      header = { typ: 'JWT', alg: 'ES256K', kid: pfiBearerDid.document.verificationMethod![0].id }
    })

    beforeEach(() => {
      payload = {
        iat : Math.floor(Date.now() / 1000),
        aud : pfiBearerDid.uri,
        iss : 'did:key:1234',
        exp : Math.floor(Date.now() / 1000 + 60),
        jti : 'randomnonce'
      }
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
          const requestToken = await createRequestTokenFromPayload(payload)
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
        const requestToken = await createRequestTokenFromPayload(payload)
        await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiBearerDid.uri })
        expect.fail()
      } catch(e) {
        expect(e).to.be.instanceof(RequestTokenAudienceMismatchError)
        expect(e.message).to.include('Request token contains invalid audience')
      }
    })
    it('returns requester\'s DID if request token is valid', async () => {
      const requestToken = await createRequestTokenFromPayload(payload)
      const iss = await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiBearerDid.uri })
      expect(iss).to.equal('did:key:1234')
    })
  })
})
