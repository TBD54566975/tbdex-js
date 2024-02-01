import { VerifiableCredential } from '@web5/credentials'
import { CreateRfqOptions, Offering } from '../src/main.js'

import { Rfq, DevTools } from '../src/main.js'
import { Convert } from '@web5/common'
import { expect } from 'chai'

describe('Rfq', () => {
  describe('create', () => {
    it('creates an rfq', async () => {
      const alice = await DevTools.createDid()
      const message = Rfq.create({
        metadata : { from: alice.did, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      expect(message.id).to.exist
      expect(message.exchangeId).to.exist
      expect(message.id).to.equal(message.exchangeId)
      expect(message.id).to.include('rfq_')
    })
  })

  describe('sign', () => {
    it('sets signature property', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(did)

      expect(rfq.signature).to.not.be.undefined
      expect(typeof rfq.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(did)

      const [base64UrlEncodedJwsHeader] = rfq.signature!.split('.')
      const jwsHeader: { kid?: string, alg?: string}  = Convert.base64Url(base64UrlEncodedJwsHeader).toObject()

      expect(jwsHeader['kid']).to.equal(did.document.verificationMethod![0].id)
      expect(jwsHeader['alg']).to.exist
    })
  })

  describe('verify', () => {
    it('does not throw an exception if message integrity is intact', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(did)
      await rfq.verify()
    })

    it('throws an error if no signature is present on the message provided', async () => {
      const alice = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: alice.did, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      try {
        await rfq.verify()
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
        await Rfq.parse(';;;)_')
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('Failed to parse message')
      }
    })

    it('returns an instance of Message if parsing is successful', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(did)

      const jsonMessage = JSON.stringify(rfq)
      const parsedMessage = await Rfq.parse(jsonMessage)

      expect(jsonMessage).to.equal(JSON.stringify(parsedMessage))
    })
  })

  describe('verifySignature', () => {
    it('throws if signature is not present', async () => {
      const rfq = Rfq.create({
        metadata : { from: 'did:ex:alice', to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      try {
        await rfq.verifySignature()
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('')
      }
    })
  })

  describe('verifyOfferingRequirements', async () => {
    let offering: Offering
    let rfqOptions: CreateRfqOptions

    beforeEach(async () => {
      const did = await DevTools.createDid()
      const vc = await VerifiableCredential.create({ // this credential fulfills the offering's required claims
        type    : 'SanctionsCredential',
        issuer  : did.did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      offering = DevTools.createOffering()
      const vcJwt = await vc.sign({ did })

      rfqOptions = {
        metadata: {
          from : '',
          to   : 'did:ex:pfi'
        },
        data: {
          ...await DevTools.createRfqData(),
          offeringId: offering.id,
        }
      }
      rfqOptions.metadata.from = did.did
      rfqOptions.data.claims = [vcJwt]
    })

    it('succeeds if Rfq satisfies Offering required claims and payin amount', async () => {
      const rfq = Rfq.create(rfqOptions)
      rfq.verifyOfferingRequirements(offering)
    })

    it('succeeds if Rfq satisfies required payin amount and Offering has no required claims', async () => {
      const pfi = await DevTools.createDid()

      const offeringData = DevTools.createOfferingData()
      offeringData.requiredClaims = undefined
      const offering = Offering.create({
        metadata: {
          from: pfi.did
        },
        data: offeringData
      })

      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          claims: [],
          offeringId: offering.metadata.id
        }
      })

      await rfq.verifyOfferingRequirements(offering)
    })

    it('throws an error if claims do not fulfill Offering\'s requirements', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          claims: []
        }
      })

      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('claims do not fulfill the offering\'s requirements')
      }
    })

    it('throws an error if offeringId doesn\'t match the provided offering\'s id', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          offeringId: 'ABC123456',
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('offering id mismatch')
      }
    })

    it('throws an error if payinAmount exceeds the provided offering\'s maxAmount', async () => {
      offering.data.payinCurrency.maxAmount = '0.01'

      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payinAmount : '99999999999999999.0',
          offeringId  : offering.id
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('rfq payinAmount exceeds offering\'s maxAmount')
      }
    })

    it('throws an error if payinAmount is less than the provided offering\'s minAmount', async () => {
      offering.data.payinCurrency.minAmount = '100000000000.0'

      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payinAmount : '0.1',
          offeringId  : offering.id
        }
      })

      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('rfq payinAmount is below offering\'s minAmount')
      }
    })

    it('throws an error if payinMethod kind cannot be validated against the provided offering\'s payinMethod kinds', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payinMethod: {
            ...rfqOptions.data.payinMethod,
            kind: 'POKEMON'
          }
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('offering does not support rfq\'s payinMethod kind')
      }
    })

    it('throws an error if payinMethod paymentDetails cannot be validated against the provided offering\'s payinMethod requiredPaymentDetails', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payinMethod: {
            ...rfqOptions.data.payinMethod,
            paymentDetails: {
              beep: 'boop'
            }
          }
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('rfq payinMethod paymentDetails could not be validated against offering requiredPaymentDetails')
      }
    })

    it('throws an error if payoutMethod kind cannot be validated against the provided offering\'s payoutMethod kinds', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payoutMethod: {
            ...rfqOptions.data.payoutMethod,
            kind: 'POKEMON'
          }
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('offering does not support rfq\'s payoutMethod kind')
      }
    })

    it('throws an error if payoutMethod paymentDetails cannot be validated against the provided offering\'s payoutMethod requiredPaymentDetails', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payoutMethod: {
            ...rfqOptions.data.payoutMethod,
            paymentDetails: {
              beep: 'boop'
            }
          }
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('rfq payoutMethod paymentDetails could not be validated against offering requiredPaymentDetails')
      }
    })
  })

  describe('verifyClaims', () => {
    it(`does not throw an exception if an rfq's claims fulfill the provided offering's requirements`, async () => {
      const did = await DevTools.createDid()
      const offering = DevTools.createOffering()
      const vc = await VerifiableCredential.create({ // this credential fulfills the offering's required claims
        type    : 'SanctionsCredential',
        issuer  : did.did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did })

      const rfqData = await DevTools.createRfqData()
      rfqData.claims = [vcJwt]

      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.verifyClaims(offering)
    })

    it(`throws an exception if an rfq's claims dont fulfill the provided offering's requirements`, async () => {
      const did = await DevTools.createDid()
      const offering = DevTools.createOffering()
      const vc = await VerifiableCredential.create({
        type    : 'PuupuuCredential',
        issuer  : did.did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did})

      const rfqData = await DevTools.createRfqData()
      rfqData.claims = [vcJwt]

      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      try {
        await rfq.verifyClaims(offering)
      } catch(e) {
        expect(e.message).to.include(`claims do not fulfill the offering's requirements`)
      }
    })
  })
})