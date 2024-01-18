import type { CreateRfqOptions, OfferingData, RfqData } from '../src/main.js'

import { VerifiableCredential } from '@web5/credentials'
import { DidKeyMethod } from '@web5/dids'
import { Rfq, Offering } from '../src/main.js'
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
  payinAmount : '20000.00',
  claims      : ['']
}

describe('Rfq', () => {
  describe('create', () => {
    it('creates an rfq', async () => {
      const alice = await DidKeyMethod.create()
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
      const did = await DidKeyMethod.create()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.sign(did)

      expect(rfq.signature).to.not.be.undefined
      expect(typeof rfq.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const did = await DidKeyMethod.create()
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
      const did = await DidKeyMethod.create()
      const rfq = Rfq.create({
        metadata : { from: did.did, to: 'did:ex:pfi' },
        data     : rfqData
      })

      await rfq.sign(did)
      await rfq.verify()
    })

    it('throws an error if no signature is present on the message provided', async () => {
      const alice = await DidKeyMethod.create()
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
      const did = await DidKeyMethod.create()
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
    const offering: Offering = createUnsignedOffering()
    const rfqOptions: CreateRfqOptions = {
      metadata: {
        from : '',
        to   : 'did:ex:pfi'
      },
      data: {
        ...rfqData,
        offeringId: offering.id,
      }
    }
    before(async () => {
      const did = await DidKeyMethod.create()
      const vc = await VerifiableCredential.create({
        type    : 'SanctionsCredential',
        issuer  : did.did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did })

      rfqOptions.metadata.from = did.did
      rfqOptions.data.claims = [vcJwt]
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
      const offering = createUnsignedOffering()
      offering.payinCurrency.maxAmount = '0.01'

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
      const did = await DidKeyMethod.create()
      const offering = createUnsignedOffering()

      const vc = await VerifiableCredential.create({
        type    : 'SanctionsCredential',
        issuer  : did.did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did })

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
          payinAmount : '20000.00',
          claims      : [vcJwt]
        }
      })

      await rfq.verifyClaims(offering)
    })

    it(`throws an exception if an rfq's claims dont fulfill the provided offering's requirements`, async () => {
      const did = await DidKeyMethod.create()
      const offering = createUnsignedOffering()

      const vc = await VerifiableCredential.create({
        type    : 'PuupuuCredential',
        issuer  : did.did,
        subject : did.did,
        data    : {
          'beep': 'boop'
        }
      })

      const vcJwt = await vc.sign({ did })

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
          payinAmount : '20000.00',
          claims      : [vcJwt]
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

function createUnsignedOffering() {
  const offeringData: OfferingData = {
    description   : 'Selling BTC for USD',
    payinCurrency : {
      currencyCode : 'USD',
      maxAmount    : '99999999.00'
    },
    payoutCurrency: {
      currencyCode : 'BTC',
      maxAmount    : '99952611.00000'
    },
    payoutUnitsPerPayinUnit : '0.00003826',
    payinMethods            : [{
      kind                   : 'DEBIT_CARD',
      requiredPaymentDetails : {
        $schema    : 'http://json-schema.org/draft-07/schema',
        type       : 'object',
        properties : {
          cardNumber: {
            type        : 'string',
            description : 'The 16-digit debit card number',
            minLength   : 16,
            maxLength   : 16
          },
          expiryDate: {
            type        : 'string',
            description : 'The expiry date of the card in MM/YY format',
            pattern     : '^(0[1-9]|1[0-2])\\/([0-9]{2})$'
          },
          cardHolderName: {
            type        : 'string',
            description : 'Name of the cardholder as it appears on the card'
          },
          cvv: {
            type        : 'string',
            description : 'The 3-digit CVV code',
            minLength   : 3,
            maxLength   : 3
          }
        },
        required             : ['cardNumber', 'expiryDate', 'cardHolderName', 'cvv'],
        additionalProperties : false
      }
    }],
    payoutMethods: [{
      kind                   : 'BTC_ADDRESS',
      requiredPaymentDetails : {
        $schema    : 'http://json-schema.org/draft-07/schema',
        type       : 'object',
        properties : {
          btcAddress: {
            type        : 'string',
            description : 'your Bitcoin wallet address'
          }
        },
        required             : ['btcAddress'],
        additionalProperties : false
      }
    }],
    requiredClaims: {
      id     : '7ce4004c-3c38-4853-968b-e411bafcd945',
      format : {
        'jwt_vc': {
          'alg': [
            'ES256K',
            'EdDSA'
          ]
        }
      },
      input_descriptors: [{
        id          : 'bbdb9b7c-5754-4f46-b63b-590bada959e0',
        constraints : {
          fields: [{
            path: [
              '$.vc.type[*]',
              '$.type[*]'
            ],
            filter: {
              type    : 'string',
              pattern : '^SanctionsCredential$'
            }
          }]
        }
      }]
    }
  }

  return Offering.create({
    metadata : { from: 'did:ex:pfi' },
    data     : offeringData
  })
}