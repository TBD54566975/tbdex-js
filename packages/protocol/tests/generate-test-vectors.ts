import { DidKeyMethod } from '@web5/dids'
import { VerifiableCredential } from '@web5/credentials'
import { Close, Message, Offering, Order, OrderStatus, Quote, Rfq } from '../src/main.js'

/**
 * Use this util when you are modifying or adding a new test vector to `tbdex`.
 */
type TestVector = {
  description: string
  input: string
  output: object
  error: boolean
}

const generateParseOfferingVector = async () => {
  const did = await DidKeyMethod.create()
  const offering = Offering.create({
    metadata : { from: did.did },
    data     : {
      description   : 'Selling BTC for USD',
      payinCurrency : {
        currencyCode : 'USD',
        maxAmount    : '1000000.00'
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

  await offering.sign(did)

  return {
    description : 'Offering parses from string',
    input       : JSON.stringify(offering.toJSON()),
    output      : offering.toJSON(),
    error       : false,
  }
}

const generateParseQuoteVector = async () => {
  const did = await DidKeyMethod.create()
  const quote = Quote.create({
    metadata: {
      exchangeId : Message.generateId('rfq'),
      from       : did.did,
      to         : 'did:ex:pfi'
    },
    data: {
      expiresAt : new Date().toISOString(),
      payin     : {
        currencyCode : 'BTC',
        amount       : '0.01',
        fee          : '0.0001'
      },
      payout: {
        currencyCode : 'USD',
        amount       : '1000.00'
      },
      paymentInstructions: {
        payin: {
          link        : 'tbdex.io/example',
          instruction : 'Fake instruction'
        },
        payout: {
          link        : 'tbdex.io/example',
          instruction : 'Fake instruction'
        }
      }
    }
  })
  await quote.sign(did)

  return {
    description : 'Quote parses from string',
    input       : JSON.stringify(quote.toJSON()),
    output      : quote.toJSON(),
    error       : false,
  }
}

const generateParseRfqVector = async () => {
  const did = await DidKeyMethod.create()
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

  await rfq.sign(did)

  return {
    description : 'RFQ parses from string',
    input       : JSON.stringify(rfq.toJSON()),
    output      : rfq.toJSON(),
    error       : false,
  }
}

const generateParseOrderVector = async () => {
  const did = await DidKeyMethod.create()
  const order = Order.create({
    metadata: { from: did.did, to: 'did:ex:pfi', exchangeId: 'abcd123' }
  })

  await order.sign(did)

  return {
    description : 'RFQ parses from string',
    input       : JSON.stringify(order),
    output      : order.toJSON(),
    error       : false,
  }
}

const generateParseCloseVector = async () => {
  const did = await DidKeyMethod.create()
  const close = Close.create({
    metadata : { from: did.did, to: 'did:ex:pfi', exchangeId: 'abcd123' },
    data     : {
      reason: 'The reason for closing the exchange'
    }
  })

  await close.sign(did)

  return {
    description : 'RFQ parses from string',
    input       : JSON.stringify(close),
    output      : close.toJSON(),
    error       : false,
  }
}

const generateParseOrderStatusVector = async () => {
  const did = await DidKeyMethod.create()
  const orderStatus = OrderStatus.create({
    metadata : { from: did.did, to: 'did:ex:pfi', exchangeId: 'abcd123' },
    data     : {
      orderStatus: 'wee'
    }
  })

  await orderStatus.sign(did)

  return {
    description : 'RFQ parses from string',
    input       : JSON.stringify(orderStatus),
    output      : orderStatus.toJSON(),
    error       : false,
  }
}

/**
 * Generates TestVector objects and prints em out.
 * From there, you can prettify it and paste it into the corresponding test vector file by hand.
 * If you think this is janky, soz bro :/ it's the level of (in)convenience that works for me right now.
 */
const overWriteTestVectors = async () => {

  // Add more test vector generators as you need them. This is not a complete list.
  const vectorFilePair: { filename: string, vector: TestVector }[] = [
    { filename: 'parse-offering.json', vector: await generateParseOfferingVector() },
    { filename: 'parse-quote.json', vector: await generateParseQuoteVector() },
    { filename: 'parse-close.json', vector: await generateParseCloseVector() },
    { filename: 'parse-rfq.json', vector: await generateParseRfqVector() },
    { filename: 'parse-order.json', vector: await generateParseOrderVector() },
    { filename: 'parse-orderstatus.json', vector: await generateParseOrderStatusVector() },
  ]

  for (const { filename, vector } of vectorFilePair) {
    console.log(filename)
    console.log(JSON.stringify(vector, null, 2))
  }
}

overWriteTestVectors()