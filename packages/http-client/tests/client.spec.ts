import { expect } from 'chai'
import { DidDhtMethod, DidKeyMethod, PortableDid } from '@web5/dids'
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
import { DevTools, Message } from '@tbdex/protocol'
import * as sinon from 'sinon'
import { JwtHeaderParams, JwtPayload, PrivateKeyJwk, Secp256k1 } from '@web5/crypto'
import { Convert } from '@web5/common'
import { Jwt } from '@web5/credentials'

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

  describe('sendMessage', () => {

    let mockRfq: Message<'rfq'>
    beforeEach(async () =>
    {
      mockRfq = await DevTools.createRfq({
        sender   : await DevTools.createDid(),
        receiver : dhtDid
      })
    })

    it('throws RequestError if service endpoint url is garbage', async () => {
      getPfiServiceEndpointStub.resolves('garbage')
      fetchStub.rejects({message: 'Failed to fetch on URL'})

      try {
        await TbdexHttpClient.sendMessage({message: mockRfq})
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
        await TbdexHttpClient.sendMessage({message: mockRfq})
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal(`https://localhost:9000/exchanges/${mockRfq.metadata.exchangeId}/rfq`)
      }
    })
    it('should not throw errors if all is well', async () => {
      fetchStub.resolves({
        ok   : true,
        json : () => Promise.resolve()
      } as Response)

      try {
        await TbdexHttpClient.sendMessage({message: mockRfq})
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

  describe('getExchange', () => {
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

  describe('getExchanges', () => {
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

  describe('generateRequestToken', () => {
    let requesterPortableDid: PortableDid
    before(async () => {
      requesterPortableDid = await DidKeyMethod.create({ keyAlgorithm: 'secp256k1' })
    })
    it('throws a RequestTokenSigningError if requesterDid is not a valid PortableDid', async () => {
      try {
        await TbdexHttpClient.generateRequestToken({ requesterDid: {did: '', document: { id: '' }, keySet: {}}, pfiDid: '' })
        expect.fail()
      } catch (e) {
        expect(e).to.be.instanceOf(RequestTokenSigningError)
      }
    })
    it('includes all expected claims', async () => {
      const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: requesterPortableDid, pfiDid: 'did:key:1234' })
      const decodedToken = await Jwt.verify({ jwt: requestToken })
      expect(decodedToken.payload).to.have.all.keys(requestTokenRequiredClaims)
    })
    // TODO: decide if we want to ensure that the expiration date is not longer than 1 minute after the issuance date
    it('sets expiration seconds to 1 minute after the time at which it was issued', async () => {
      const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: requesterPortableDid, pfiDid: 'did:key:1234' })
      const decodedToken = await Jwt.verify({ jwt: requestToken })
      expect(decodedToken.payload.exp - decodedToken.payload.iat).to.equal(60)
    })
  })

  describe('verifyRequestToken', () => {
    let pfiPortableDid: PortableDid
    let header: JwtHeaderParams
    let payload: JwtPayload

    async function createRequestTokenFromPayload(payload) {
      const privateKeyJwk = pfiPortableDid.keySet.verificationMethodKeys![0].privateKeyJwk
      const base64UrlEncodedHeader = Convert.object(header).toBase64Url()
      const base64UrlEncodedPayload = Convert.object(payload).toBase64Url()

      const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`
      const toSignBytes = Convert.string(toSign).toUint8Array()
      const signatureBytes = await Secp256k1.sign({ key: privateKeyJwk as PrivateKeyJwk, data: toSignBytes })
      const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url()

      return `${toSign}.${base64UrlEncodedSignature}`
    }

    before(async () => {
      pfiPortableDid = await DidKeyMethod.create({ keyAlgorithm: 'secp256k1' })
      header = { typ: 'JWT', alg: 'ES256K', kid: pfiPortableDid.document.verificationMethod![0].id }
    })

    beforeEach(() => {
      payload = {
        iat : Math.floor(Date.now() / 1000),
        aud : pfiPortableDid.did,
        iss : 'did:key:1234',
        exp : Math.floor(Date.now() / 1000 + 60),
        jti : 'randomnonce'
      }
    })

    it('throws RequestTokenVerificationError if request token is not a valid jwt', async () => {
      try {
        await TbdexHttpClient.verifyRequestToken({ requestToken: '', pfiDid: pfiPortableDid.did })
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
          await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiPortableDid.did })
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
        await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiPortableDid.did })
        expect.fail()
      } catch(e) {
        expect(e).to.be.instanceof(RequestTokenAudienceMismatchError)
        expect(e.message).to.include('Request token contains invalid audience')
      }
    })
    it('returns requester\'s DID if request token is valid', async () => {
      const requestToken = await createRequestTokenFromPayload(payload)
      const iss = await TbdexHttpClient.verifyRequestToken({ requestToken, pfiDid: pfiPortableDid.did })
      expect(iss).to.equal('did:key:1234')
    })
  })
})
