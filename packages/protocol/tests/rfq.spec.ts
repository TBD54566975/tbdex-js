import type { RfqData } from '../src/main.js'

import { Rfq, DevTools } from '../src/main.js'
import { Convert } from '@web5/common'
import { expect } from 'chai'

const rfqData: RfqData = {
  offeringId  : 'abcd123',
  payinMethod : {
    kind           : 'DEBIT_CARD',
    paymentDetails : {
      'cardNumber'     : '1234567890123456',
      'expiryDate'     : '12/22',
      'cardHolderName' : 'Ephraim Bartholomew Winthrop',
      'cvv'            : '123'
    }
  },
  payoutMethod: {
    kind           : 'BTC_ADDRESS',
    paymentDetails : {
      btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    }
  },
  payinSubunits : '20000',
  claims        : ['']
}

describe('Rfq', () => {
  describe('create', () => {
    it('creates an rfq', async () => {
      const alice = await DevTools.createDid()
      const message = Rfq.create({
        metadata : { from: alice.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      expect(message.id).to.exist
      expect(message.exchangeId).to.exist
      expect(message.id).to.equal(message.exchangeId)
      expect(message.id).to.include('rfq_')
    })
  })

  describe('validate', () => {
    it('throws an error if payload is not an object', () => {
      const testCases = ['hi', [], 30, ';;;)_', true, null, undefined]
      for (let testCase of testCases) {
        try {
          Rfq.validate(testCase)
          expect.fail()
        } catch(e) {
          expect(e.message).to.include('must be object')
        }
      }
    })

    it('throws an error if required properties are missing', () => {
      try {
        Rfq.validate({})
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('required property')
      }
    })
  })

  describe('sign', () => {
    it('sets signature property', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.sign(did)

      expect(rfq.signature).to.not.be.undefined
      expect(typeof rfq.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.sign(did)

      const [base64UrlEncodedJwsHeader] = rfq.signature.split('.')
      const jwsHeader = Convert.base64Url(base64UrlEncodedJwsHeader).toObject()

      expect(jwsHeader['kid']).to.equal(did.document.verificationMethod[0].id)
      expect(jwsHeader['alg']).to.exist
    })
  })

  describe('verify', () => {
    it('does not throw an exception if message integrity is intact', async () => {
      const did = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.sign(did)
      await rfq.verify()
    })

    it('throws an error if no signature is present on the message provided', async () => {
      const alice = await DevTools.createDid()
      const rfq = Rfq.create({
        metadata : { from: alice.did, to: 'did:ex:pfi' },
        data     : rfqData
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
        data     : rfqData
      })


      await rfq.sign(did)

      const jsonMessage = JSON.stringify(rfq)
      const parsedMessage = await Rfq.parse(jsonMessage)

      expect(jsonMessage).to.equal(JSON.stringify(parsedMessage))
    })
  })

  describe('verifyOfferingRequirements', () => {
    let offering
    let rfqData
    before(() => {
      async function initMocks() {
        const did = await DevTools.createDid()
        const { signedCredential } = await DevTools.createCredential({ // this credential fulfills the offering's required claims
          type    : 'SanctionsCredential',
          issuer  : did,
          subject : did.did,
          data    : {
            'beep': 'boop'
          }
        })
        offering = DevTools.createOffering()
        rfqData = {
          metadata : { from: did.did, to: 'did:ex:pfi' },
          data     : {
            offeringId  : offering.id,
            payinMethod : {
              kind           : 'DEBIT_CARD',
              paymentDetails : {
                'cardNumber'     : '1234567890123456',
                'expiryDate'     : '12/22',
                'cardHolderName' : 'Ephraim Bartholomew Winthrop',
                'cvv'            : '123'
              }
            },
            payoutMethod: {
              kind           : 'BTC_ADDRESS',
              paymentDetails : {
                btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
              }
            },
            payinSubunits : '20000',
            claims        : [signedCredential]
          }
        }
      }

      initMocks()
    })
    it('throws an error if offeringId doesn\'t match the provided offering\'s id', async () => {
      const rfq = Rfq.create({
        ...rfqData,
        data: {
          ...rfqData.data,
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
    it('throws an error if payinSubunits exceeds the provided offering\'s maxSubunits', async () => {
      const rfq = Rfq.create({
        ...rfqData,
        data: {
          ...rfqData.data,
          payinSubunits: '99999999999999999'
        }
      })
      try {
        await rfq.verifyOfferingRequirements(offering)
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('rfq payinSubunits exceeds offering\'s maxSubunits')
      }
    })
    it('throws an error if cannot be validated against the provided offering\'s payinMethod kinds', async () => {
      const rfq = Rfq.create({
        ...rfqData,
        data: {
          ...rfqData.data,
          payinMethod: {
            ...rfqData.data.payinMethod,
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
  })

  describe('verifyClaims', () => {
    it(`does not throw an exception if an rfq's claims fulfill the provided offering's requirements`, async () => {
      const did = await DevTools.createDid()
      const offering = DevTools.createOffering()
      const { signedCredential } = await DevTools.createCredential({ // this credential fulfills the offering's required claims
        type    : 'SanctionsCredential',
        issuer  : did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : {
          offeringId  : 'abcd123',
          payinMethod : {
            kind           : 'DEBIT_CARD',
            paymentDetails : {
              'cardNumber'     : '1234567890123456',
              'expiryDate'     : '12/22',
              'cardHolderName' : 'Ephraim Bartholomew Winthrop',
              'cvv'            : '123'
            }
          },
          payoutMethod: {
            kind           : 'BTC_ADDRESS',
            paymentDetails : {
              btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
            }
          },
          payinSubunits : '20000',
          claims        : [signedCredential]
        }
      })

      await rfq.verifyClaims(offering)
    })

    it(`throws an exception if an rfq's claims dont fulfill the provided offering's requirements`, async () => {
      const did = await DevTools.createDid()
      const offering = DevTools.createOffering()
      const { signedCredential } = await DevTools.createCredential({
        type    : 'PuupuuCredential',
        issuer  : did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : {
          offeringId  : 'abcd123',
          payinMethod : {
            kind           : 'DEBIT_CARD',
            paymentDetails : {
              'cardNumber'     : '1234567890123456',
              'expiryDate'     : '12/22',
              'cardHolderName' : 'Ephraim Bartholomew Winthrop',
              'cvv'            : '123'
            }
          },
          payoutMethod: {
            kind           : 'BTC_ADDRESS',
            paymentDetails : {
              btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
            }
          },
          payinSubunits : '20000',
          claims        : [signedCredential]
        }
      })

      try {
        await rfq.verifyClaims(offering)
      } catch(e) {
        expect(e.message).to.include(`claims do not fulfill the offering's requirements`)
      }
    })
  })
})