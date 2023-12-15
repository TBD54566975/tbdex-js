import { MessageKindClass, Offering, Rfq, Quote, Order, OrderStatus, Close } from '@tbdex/protocol'
import { OfferingsApi, ExchangesApi } from './main.js'

const offering = await Offering.create({
  metadata : { from: 'did:ex:pfi' },
  data     : {
    description   : 'Selling BTC for USD',
    payinCurrency : {
      currencyCode: 'USD'
    },
    payoutCurrency: {
      currencyCode : 'BTC',
      maxAmount    : '999526.11'
    },
    rate         : '0.000038',
    payinMethods : [{
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
})

export const fakeOfferingsApi: OfferingsApi = {
  async getOffering() { return offering },
  async getOfferings() { return [offering] }
}

export const fakeExchangesApi: ExchangesApi = {
  getExchanges: function (): Promise<MessageKindClass[][]> {
    throw new Error('Function not implemented.')
  },
  getExchange: function (): Promise<MessageKindClass[]> {
    throw new Error('Function not implemented.')
  },
  getRfq: function (): Promise<Rfq> {
    throw new Error('Function not implemented.')
  },
  getQuote: function (): Promise<Quote> {
    throw new Error('Function not implemented.')
  },
  getOrder: function (): Promise<Order> {
    throw new Error('Function not implemented.')
  },
  getOrderStatuses: function (): Promise<OrderStatus[]> {
    throw new Error('Function not implemented.')
  },
  getClose: function (): Promise<Close> {
    throw new Error('Function not implemented.')
  }
}