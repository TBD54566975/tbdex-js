import { Offering, Parser } from '../src/main.js'
import { DevTools } from '../src/dev-tools.js'
import { Convert } from '@web5/common'
import { expect } from 'chai'
import { DidDht } from '@web5/dids'

describe('Offering', () => {
  describe('create', () => {
    it('creates an Offering', async () => {
      const data = DevTools.createOfferingData()

      const offering = Offering.create({
        metadata: { from: 'did:ex:pfi', },
        data,
      })

      expect(offering.isOffering()).to.be.true
      expect(offering.metadata.kind).to.eq('offering')
      expect(offering.id).to.exist
      expect(offering.id).to.include('offering_')
      expect(offering.metadata.createdAt).to.exist
      expect(offering.data).to.eq(data)
    })

    it('throws if the data is not valid', async () => {
      const data = DevTools.createOfferingData()
      delete (data as any).description

      expect(() => {
        Offering.create({
          metadata: { from: 'did:ex:pfi' },
          data,
        })
      }).to.throw
    })
  })

  describe('sign', () => {
    it('sets signature property', async () => {
      const pfi = await DidDht.create()
      const offering = Offering.create({
        metadata : { from: pfi.uri},
        data     : DevTools.createOfferingData()
      })


      await offering.sign(pfi)

      expect(offering.signature).to.not.be.undefined
      expect(typeof offering.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const pfi = await DidDht.create()
      const offering = Offering.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createOfferingData()
      })

      await offering.sign(pfi)

      const [base64UrlEncodedJwsHeader] = offering.signature!.split('.')
      const jwsHeader: { kid?: string, alg?: string} = Convert.base64Url(base64UrlEncodedJwsHeader).toObject()

      expect(jwsHeader.kid).to.equal(pfi.document.verificationMethod![0].id)
      expect(jwsHeader.alg).to.exist
    })
  })

  describe('verify', () => {
    it('does not throw an exception if resource integrity is intact', async () => {
      const pfi = await DidDht.create()
      const offering = Offering.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createOfferingData()
      })

      await offering.sign(pfi)
      await offering.verify()
    })

    it('throws an error if no signature is present on the resource provided', async () => {
      const pfi = await DidDht.create()
      const offering = Offering.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createOfferingData()
      })

      try {
        await offering.verify()
        expect.fail()
      } catch(e) {
        expect(e.message).to.include(`must have required property 'signature'`)
      }
    })

    xit('throws an error if signature is not a valid compact JWS')
    xit('throws an error if signature is payload is included in JWS')
    xit('throws an error if JWS header doesnt include alg and kid properties')
    xit('throws an error if DID in kid of JWS header doesnt match metadata.from in message')
    xit('throws an error if no verification method can be found in signers DID Doc')
    xit('throws an error if verification method does not include publicKeyJwk')

  })

  describe('parse', () => {
    it('throws an error if payload is not valid JSON', async () => {
      try {
        await Parser.parseResource(';;;)_')
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('Failed to parse resource')
      }
    })

    it('returns a Resource instance if parsing is successful', async () => {
      const pfi = await DidDht.create()
      const offering = Offering.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createOfferingData()
      })

      await offering.sign(pfi)

      const jsonResource = JSON.stringify(offering)
      const parsedResource = await Parser.parseResource(jsonResource)

      expect(jsonResource).to.equal(JSON.stringify(parsedResource))
    })
  })
})