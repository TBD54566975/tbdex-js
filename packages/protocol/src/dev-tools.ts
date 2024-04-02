
import type { BalanceData, OfferingData, QuoteData, CreateRfqData } from './types.js'
import type { BearerDid } from '@web5/dids'

import { Balance, Offering } from './resource-kinds/index.js'
import { Rfq } from './message-kinds/index.js'
import { Resource } from './resource.js'
import { VerifiableCredential } from '@web5/credentials'

/**
 * Options passed to {@link DevTools.createRfq}
 * @beta
 */
export type MessageOptions = {
  /**
   * {@link @web5/dids#BearerDid} of the message sender. When generating RFQ, it is used to generate a random credential that fulfills the vcRequirements
   * of the offering returned by {@link DevTools.createOffering}
   */
  sender: BearerDid
  /**
   * {@link @web5/dids#BearerDid} of the rfq receiver.
   */
  receiver?: BearerDid
}

/**
 * Utility functions for testing purposes
 * @beta
 */
export class DevTools {
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
      description : 'Selling BTC for USD',
      payin       : {
        currencyCode : 'USD',
        min          : '0.0',
        max          : '999999.99',
        methods      : [{
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
        }]
      },
      payout: {
        currencyCode : 'BTC',
        max          : '999526.11',
        methods      : [{
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
          },
          estimatedSettlementTime: 10, // seconds
        }]
      },
      payoutUnitsPerPayinUnit : '0.00003826',
      requiredClaims          : {
        id                : '7ce4004c-3c38-4853-968b-e411bafcd945',
        input_descriptors : [{
          id          : 'bbdb9b7c-5754-4f46-b63b-590bada959e0',
          constraints : {
            fields: [
              {
                path   : ['$.type[*]'],
                filter : {
                  type    : 'string',
                  pattern : '^YoloCredential$'
                }
              },

            ]
          }
        }]
      }
    }
  }

  /**
   * creates and returns an example balance. Useful for testing purposes
   */
  static createBalance(opts?: { from?: string, balanceData?: BalanceData }): Balance {
    return Balance.create({
      metadata : { from: opts?.from ?? 'did:ex:pfi' },
      data     : opts?.balanceData ?? DevTools.createBalanceData()
    })
  }

  /**
   * creates an example BalanceData. Useful for testing purposes
   */
  static createBalanceData(): BalanceData {
    return {
      currencyCode : 'USD',
      available    : '400.00'
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
  static async createRfq(opts: MessageOptions) {
    const { sender, receiver } = opts

    const rfqData: CreateRfqData = await DevTools.createRfqData(opts)

    return Rfq.create({
      metadata : { from: sender.uri, to: receiver?.uri ?? 'did:ex:pfi' },
      data     : rfqData
    })
  }

  /**
   * creates an example RfqData. Useful for testing purposes
   */
  static async createRfqData(opts?: MessageOptions): Promise<CreateRfqData> {
    let vcJwt: string = ''

    if (opts?.sender) {
      const vc = await VerifiableCredential.create({
        type    : 'YoloCredential',
        issuer  : opts.sender.uri,
        subject : opts.sender.uri,
        data    : {
          'beep': 'boop'
        }
      })
      vcJwt = await vc.sign({ did: opts.sender })
    }

    return {
      offeringId : Resource.generateId('offering'),
      payin      : {
        kind           : 'DEBIT_CARD',
        amount         : '200.00',
        paymentDetails : {
          'cardNumber'     : '1234567890123456',
          'expiryDate'     : '12/22',
          'cardHolderName' : 'Ephraim Bartholomew Winthrop',
          'cvv'            : '123'
        }
      },
      payout: {
        kind           : 'BTC_ADDRESS',
        paymentDetails : {
          btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
        }
      },
      claims: [vcJwt]
    }
  }
}