import { Offering } from '../src/main.js'
import { DevTools } from '../src/dev-tools.js'
import { Convert } from '@web5/common'
import { expect } from 'chai'

describe('Offering', () => {
  describe('create', () => {
    it('creates a resource', async () => {
      const pfi = await DevTools.createDid()
      const offering = Offering.create({
        metadata : { from: pfi.did },
        data     : DevTools.createOfferingData()
      })

      expect(offering.id).to.exist
      expect(offering.id).to.include('offering_')
    })
  })

  describe('validate', () => {
    it('throws an error if payload is not an object', () => {
      const testCases = ['hi', [], 30, ';;;)_', true, null, undefined]
      for (let testCase of testCases) {
        try {
          Offering.validate(testCase)
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('must be object')
        }
      }
    })

    it('throws an error if required properties are missing', () => {
      try {
        Offering.validate({})
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('required property')
      }
    })

    it('throws an error if additional properties are present', async () => {
      const pfi = await DevTools.createDid()

      try {
        const offeringData = DevTools.createOfferingData()
        offeringData['foo'] = 'bar'
        const offering = Offering.create({
          metadata : { from: pfi.did },
          data     : offeringData
        })
        await offering.sign(pfi)

        Offering.validate(offering)
        expect.fail()
      } catch (e) {
        expect(e.message).to.include('additional properties')
      }
    })
  })

  describe('sign', () => {
    it('sets signature property', async () => {
      const pfi = await DevTools.createDid()
      const offering = Offering.create({
        metadata : { from: pfi.did },
        data     : DevTools.createOfferingData()
      })


      await offering.sign(pfi)

      expect(offering.signature).to.not.be.undefined
      expect(typeof offering.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const pfi = await DevTools.createDid()
      const offering = Offering.create({
        metadata : { from: pfi.did },
        data     : DevTools.createOfferingData()
      })


      await offering.sign(pfi)

      const [base64UrlEncodedJwsHeader] = offering.signature.split('.')
      const jwsHeader = Convert.base64Url(base64UrlEncodedJwsHeader).toObject()

      expect(jwsHeader['kid']).to.equal(pfi.document.verificationMethod[0].id)
      expect(jwsHeader['alg']).to.exist
    })
  })

  describe('verify', () => {
    it('does not throw an exception if resource integrity is intact', async () => {
      const pfi = await DevTools.createDid()
      const offering = Offering.create({
        metadata : { from: pfi.did },
        data     : DevTools.createOfferingData()
      })

      await offering.sign(pfi)
      await offering.verify()
    })

    it('throws an error if no signature is present on the resource provided', async () => {
      const pfi = await DevTools.createDid()
      const offering = Offering.create({
        metadata : { from: pfi.did },
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
        await Offering.parse(';;;)_')
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('Failed to parse resource')
      }
    })

    it('returns a Resource instance if parsing is successful', async () => {
      const pfi = await DevTools.createDid()
      const offering = Offering.create({
        metadata : { from: pfi.did },
        data     : DevTools.createOfferingData()
      })

      await offering.sign(pfi)

      const jsonResource = JSON.stringify(offering)
      const parsedResource = await Offering.parse(jsonResource)

      expect(jsonResource).to.equal(JSON.stringify(parsedResource))
    })
  })
})