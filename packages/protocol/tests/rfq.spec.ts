import { VerifiableCredential } from '@web5/credentials'
import { CreateRfqOptions, Offering } from '../src/main.js'

import { Rfq, DevTools } from '../src/main.js'
import { Convert } from '@web5/common'
import { expect } from 'chai'
import { DidDht, DidJwk } from '@web5/dids'

describe('Rfq', () => {
  describe('create', () => {
    it('creates an rfq', async () => {
      const aliceDid = await DidJwk.create()

      const message = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      expect(message.id).to.exist
      expect(message.exchangeId).to.exist
      expect(message.id).to.equal(message.exchangeId)
      expect(message.id).to.include('rfq_')
      expect(message.metadata.protocol).to.equal('1.0')
    })
  })

  describe('sign', () => {
    it('sets signature property', async () => {
      const aliceDid = await DidJwk.create()
      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(aliceDid)

      expect(rfq.signature).to.not.be.undefined
      expect(typeof rfq.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const aliceDid = await DidJwk.create()
      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(aliceDid)

      const [base64UrlEncodedJwsHeader] = rfq.signature!.split('.')
      const jwsHeader: { kid?: string, alg?: string}  = Convert.base64Url(base64UrlEncodedJwsHeader).toObject()

      expect(jwsHeader['kid']).to.equal(aliceDid.document.verificationMethod![0].id)
      expect(jwsHeader['alg']).to.exist
    })
  })

  describe('verify', () => {
    it('does not throw an exception if message integrity is intact', async () => {
      const aliceDid = await DidJwk.create()
      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(aliceDid)
      await rfq.verify()
    })

    it('throws an error if no signature is present on the message provided', async () => {
      const aliceDid = await DidJwk.create()
      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
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
      const aliceDid = await DidJwk.create()
      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data     : await DevTools.createRfqData()
      })

      await rfq.sign(aliceDid)

      const jsonMessage = JSON.stringify(rfq)
      const parsedMessage = await Rfq.parse(jsonMessage)

      expect(jsonMessage).to.equal(JSON.stringify(parsedMessage))
    })

    describe('requireAllPrivateData: true', () => {
      it('succeeds when all privateData is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()

        await Rfq.parse(rfqJson, { requireAllPrivateData: true })
      })

      it('throws if private data is missing but hashed fields are present in Rfq.data', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()
        delete rfqJson.privateData

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('Could not verify all privateData because privateData property is missing')
        }
      })

      it('throws if salt is missing but hashed fields are present in Rfq.data', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()
        delete (rfqJson.privateData as any).salt

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('must have required property \'salt\'')
        }
      })


      it('throws if Rfq.privateData.payin.paymentDetails is incorrect but Rfq.data.payin.paymentDetailsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        rfq.data.payin.paymentDetailsHash = '123'
        await rfq.sign(aliceDid)

        const rfqJson: any = rfq.toJSON()

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.payin.paymentDetailsHash does not match digest of privateData.payin.paymentDetails')
        }
      })

      it('throws if Rfq.privateData.payout.paymentDetails is incorrect but Rfq.data.payout.paymentDetailsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        rfq.data.payout.paymentDetailsHash = '123'
        await rfq.sign(aliceDid)

        const rfqJson: any = rfq.toJSON()

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.payout.paymentDetailsHash does not match digest of privateData.payout.paymentDetails')
        }
      })

      it('throws if Rfq.privateData.claims is incorrect but Rfq.data.claimsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        rfq.data.claimsHash = 'not right'
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.claimsHash does not match digest of privateData.claims')
        }
      })

      it('throws if Rfq.privateData.payin.paymentDetails is missing but Rfq.data.payin.paymentDetailsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()
        delete rfqJson.privateData!.payin!.paymentDetails

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.payin.paymentDetailsHash does not match digest of privateData.payin.paymentDetails')
        }
      })

      it('throws if Rfq.privateData.payout.paymentDetails is missing but Rfq.data.payout.paymentDetailsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()
        delete rfqJson.privateData!.payout!.paymentDetails

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.payout.paymentDetailsHash does not match digest of privateData.payout.paymentDetails')
        }
      })

      it('throws if Rfq.privateData.claims is missing but Rfq.data.claimsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()
        delete rfqJson.privateData!.claims

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: true })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.claimsHash does not match digest of privateData.claims')
        }
      })
    })

    describe('requireAllPrivateData: false', () => {
      it('throws if salt is missing but hashed fields are present in Rfq.data', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()
        delete (rfqJson.privateData as any).salt

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: false })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('must have required property \'salt\'')
        }
      })

      it('throws if Rfq.privateData.payin.paymentDetails is missing but Rfq.data.payin.paymentDetailsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        rfq.data.payin.paymentDetailsHash = '123'
        await rfq.sign(aliceDid)

        const rfqJson: any = rfq.toJSON()

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: false })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.payin.paymentDetailsHash does not match digest of privateData.payin.paymentDetails')
        }
      })

      it('throws if Rfq.privateData.payout.paymentDetails is missing but Rfq.data.payout.paymentDetailsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        rfq.data.payout.paymentDetailsHash = '123'
        await rfq.sign(aliceDid)

        const rfqJson: any = rfq.toJSON()

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: false })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.payout.paymentDetailsHash does not match digest of privateData.payout.paymentDetails')
        }
      })

      it('throws if Rfq.privateData.claims is missing but Rfq.data.claimsHash is present', async () => {
        const aliceDid = await DidJwk.create()
        const rfq = Rfq.create({
          metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
          data     : await DevTools.createRfqData()
        })
        rfq.data.claimsHash = 'not right'
        await rfq.sign(aliceDid)

        const rfqJson = rfq.toJSON()

        try {
          await Rfq.parse(rfqJson, { requireAllPrivateData: false })
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('data.claimsHash does not match digest of privateData.claims')
        }
      })
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
      const aliceDid = await DidJwk.create()
      const vc = await VerifiableCredential.create({ // this credential fulfills the offering's required claims
        type    : 'YoloCredential',
        issuer  : aliceDid.uri,
        subject : aliceDid.uri,
        data    : {
          'beep': 'boop'
        }
      })

      offering = DevTools.createOffering()
      const vcJwt = await vc.sign({ did: aliceDid })

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
      rfqOptions.metadata.from = aliceDid.uri
      rfqOptions.data.claims = [vcJwt]
    })

    it('succeeds if Rfq satisfies Offering required claims and payin amount', async () => {
      const rfq = Rfq.create(rfqOptions)
      rfq.verifyOfferingRequirements(offering)
    })

    it('succeeds if Rfq satisfies required payin amount and Offering has no required claims', async () => {
      const pfi = await DidDht.create()

      const offeringData = DevTools.createOfferingData()
      offeringData.requiredClaims = undefined
      const offering = Offering.create({
        metadata: {
          from: pfi.uri
        },
        data: offeringData
      })

      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          claims     : [],
          offeringId : offering.metadata.id
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

    it('throws an error if rfq protocol doesn\'t match the provided offering\'s protocol', async () => {
      const rfq = Rfq.create({
        metadata: {
          from     : '',
          to       : 'did:ex:pfi',
          protocol : '2.0'
        },
        data: {
          ...rfqOptions.data,
          offeringId: 'ABC123456',
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('protocol version mismatch')
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

    it('throws an error if payinAmount exceeds the provided offering\'s max', async () => {
      offering.data.payin.max = '0.01'

      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payin: {
            ...rfqOptions.data.payin,
            amount: '99999999999999999.0',
          },
          offeringId: offering.id
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('rfq payinAmount exceeds offering\'s max')
      }
    })

    it('throws an error if payinAmount is less than the provided offering\'s minAmount', async () => {
      offering.data.payin.min = '100000000000.0'

      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payin: {
            ...rfqOptions.data.payin,
            amount: '0.1',
          },
          offeringId: offering.id
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
          payin: {
            ...rfqOptions.data.payin,
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

    it('throws an error if paymentDetails is present but offering\'s requiredPaymentDetails is omitted', async () => {
      offering.data.payin.methods = [{
        kind: 'CASH',
        // requiredPaymentDetails deliberately omitted
      }]
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payin: {
            ...rfqOptions.data.payin, // paymentDetails deliberately present
            kind: 'CASH'
          }
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('paymentDetails must be omitted when requiredPaymentDetails is omitted')
      }
    })

    it('succeeds if paymentDetails is omitted and offering\'s requiredPaymentDetails is omitted', async () => {
      offering.data.payin.methods = [{
        kind: 'CASH',
        // requiredPaymentDetails deliberately omitted
      }]
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payin: {
            // paymentDetails deliberately omitted
            kind   : 'CASH',
            amount : '100.0'
          }
        }
      })
      await rfq.verifyOfferingRequirements(offering)
    })

    it('throws an error if payinMethod paymentDetails cannot be validated against the provided offering\'s payinMethod requiredPaymentDetails', async () => {
      const rfq = Rfq.create({
        ...rfqOptions,
        data: {
          ...rfqOptions.data,
          payin: {
            ...rfqOptions.data.payin,
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
          payout: {
            ...rfqOptions.data.payout,
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
          payout: {
            ...rfqOptions.data.payout,
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

    it('accepts selected payment method if it matches one but not all of the Offerings requiredPaymentDetails of matching kind', async () => {
      // scenario: An offering has two payin methods with kind 'card'. One payin method requires property 'cardNumber' and 'pin' in the RFQ's selected
      //           payin method. The second payin method only requires 'cardNumber'. An RFQ has selected payin method with kind 'card' and only
      //           payment detail 'cardNumber', so it matches the Offering's second payin method but not the first. The RFQ is valid against the offering.
      const offeringData = DevTools.createOfferingData()

      // Supply Offering with two payin methods of kind 'card'.
      // The first requires 'cardNumber' and 'pin'. The second only requires 'cardNumber'.
      offeringData.requiredClaims = undefined
      offeringData.payin.methods = [
        {
          kind                   : 'card',
          requiredPaymentDetails : {
            $schema    : 'http://json-schema.org/draft-07/schema',
            type       : 'object',
            properties : {
              cardNumber: {
                type: 'string'
              },
              pin: {
                type: 'string'
              },
            },
            required             : ['cardNumber', 'pin'],
            additionalProperties : false
          }
        },
        {
          kind                   : 'card',
          requiredPaymentDetails : {
            $schema    : 'http://json-schema.org/draft-07/schema',
            type       : 'object',
            properties : {
              cardNumber: {
                type: 'string'
              }
            },
            required             : ['cardNumber'],
            additionalProperties : false
          }
        }
      ]

      const pfi = await DidJwk.create()

      const offering = Offering.create({
        metadata : { from: pfi.uri },
        data     : offeringData,
      })
      await offering.sign(pfi)

      // Construct RFQ with a payin method that has payin detail 'cardNumber'
      const alice = await DidJwk.create()
      const rfqData = await DevTools.createRfqData()
      rfqData.offeringId = offering.metadata.id
      rfqData.payin = {
        kind           : 'card',
        paymentDetails : {
          cardNumber: '1234'
        },
        amount: '100.0'
      }
      const rfq = Rfq.create({
        metadata: {
          from : alice.uri,
          to   : pfi.uri,
        },
        data: rfqData,
      })
      await rfq.sign(alice)

      await rfq.verifyOfferingRequirements(offering)
    })
  })

  describe('verifyClaims', () => {
    it(`does not throw an exception if an rfq's claims fulfill the provided offering's requirements`, async () => {
      const aliceDid = await DidJwk.create()
      const offering = DevTools.createOffering()
      const vc = await VerifiableCredential.create({ // this credential fulfills the offering's required claims
        type    : 'YoloCredential',
        issuer  : aliceDid.uri,
        subject : aliceDid.uri,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did: aliceDid })

      const rfqData = await DevTools.createRfqData()
      rfqData.claims = [vcJwt]

      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.verifyClaims(offering)
    })

    it(`throws an exception if an rfq's claims dont fulfill the provided offering's requirements`, async () => {
      const aliceDid = await DidJwk.create()
      const offering = DevTools.createOffering()
      const vc = await VerifiableCredential.create({
        type    : 'PuupuuCredential',
        issuer  : aliceDid.uri,
        subject : aliceDid.uri,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did: aliceDid })

      const rfqData = await DevTools.createRfqData()
      rfqData.claims = [vcJwt]

      const rfq = Rfq.create({
        metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
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