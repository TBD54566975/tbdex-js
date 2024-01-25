
import type { OfferingData, QuoteData, RfqData } from './types.js'
import type { PortableDid } from '@web5/dids'
import { DidDhtMethod, DidIonMethod, DidKeyMethod } from '@web5/dids'
import { VerifiableCredential } from '@web5/credentials'
import { Offering } from './resource-kinds/index.js'
import { Rfq } from './message-kinds/index.js'
import { Resource } from './resource.js'

/**
 * Supported DID Methods
 * @beta
 */
export type DidMethodOptions = 'key' | 'ion'

/**
 * Options passed to {@link DevTools.createRfq}
 * @beta
 */
export type RfqOptions = {
  /**
   * {@link @web5/dids#PortableDid} of the rfq sender. used to generate a random credential that fulfills the vcRequirements
   * of the offering returned by {@link DevTools.createOffering}
   */
  sender: PortableDid
  /**
   * {@link @web5/dids#PortableDid} of the rfq receiver.
   */
  receiver?: PortableDid
}

/**
 * Utility functions for testing purposes
 * @beta
 */
export class DevTools {
  /**
   * creates and returns a DID
   * @param didMethod - the type of DID to create. defaults to did:key
   */
  static async createDid(didMethod: DidMethodOptions = 'key') {
    if (didMethod === 'key') {
      return await DidKeyMethod.create()
    } else if (didMethod === 'ion') {
      return await DidIonMethod.create()
    } else if (didMethod === 'dht') {
      return await DidDhtMethod.create()
    } else {
      throw new Error(`${didMethod} method not implemented.`)
    }
  }

  /**
   * creates and returns an example offering. Useful for testing purposes
   */
  static createOffering(opts?: { from?: string, offeringData?: OfferingData }): Offering {
    return Offering.create({
      metadata : { from: opts?.from ?? 'did:ex:pfi' },
      data     : opts?.offeringData ?? DevTools.createOfferingData()
    })
  }

  /**
   * creates an example OfferingData. Useful for testing purposes
   */
  static createOfferingData(): OfferingData {
    return {
      description   : 'Selling BTC for USD',
      payinCurrency : {
        currencyCode : 'USD',
        minAmount    : '0.0',
        maxAmount    : '999999.99',
      },
      payoutCurrency: {
        currencyCode : 'BTC',
        maxAmount    : '999526.11'
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
        id                : '7ce4004c-3c38-4853-968b-e411bafcd945',
        input_descriptors : [{
          id          : 'bbdb9b7c-5754-4f46-b63b-590bada959e0',
          constraints : {
            fields: [{
              path   : ['$.type'],
              filter : {
                type  : 'string',
                const : 'YoloCredential'
              }
            }]
          }
        }]
      }
    }
  }

  /**
   * creates an example QuoteData. Useful for testing purposes
   */
  static createQuoteData(): QuoteData {
    return {
      expiresAt : new Date().toISOString(),
      payin     : {
        currencyCode       : 'BTC',
        amount             : '0.01',
        fee                : '0.0001',
        paymentInstruction : {
          link        : 'tbdex.io/example',
          instruction : 'Fake instruction'
        }
      },
      payout: {
        currencyCode       : 'USD',
        amount             : '1000.00',
        paymentInstruction : {
          link        : 'tbdex.io/example',
          instruction : 'Fake instruction'
        }
      }
    }
  }

  /**
   *
   * creates and returns an example rfq for the offering returned by {@link DevTools.createOffering}.
   * Useful for testing purposes.
   *
   * **NOTE**: generates a random credential that fulfills the offering's required claims
   */
  static async createRfq(opts: RfqOptions) {
    const { sender, receiver } = opts

    const rfqData: RfqData = await DevTools.createRfqData(opts)

    return Rfq.create({
      metadata : { from: sender.did, to: receiver?.did ?? 'did:ex:pfi' },
      data     : rfqData
    })
  }

  /**
   * creates an example RfqData. Useful for testing purposes
   */
  static async createRfqData(opts?: RfqOptions): Promise<RfqData> {
    let vcJwt: string = ''

    if (opts?.sender) {
      const vc = await VerifiableCredential.create({
        type    : 'YoloCredential',
        issuer  : opts.sender.did,
        subject : opts.sender.did,
        data    : {
          'beep': 'boop'
        }
      })
      vcJwt = await vc.sign({ did: opts.sender })
    }

    return {
      offeringId  : Resource.generateId('offering'),
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
      payinAmount : '200.00',
      claims      : [vcJwt]
    }
  }
}