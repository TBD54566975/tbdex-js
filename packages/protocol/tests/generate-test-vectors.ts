import { DidKeyMethod } from '@web5/dids'
import { VerifiableCredential } from '@web5/credentials'
import { Close, DevTools, Message, Order, OrderStatus, Quote, Rfq } from '../src/main.js'
import fs from 'fs'

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
  const offering = DevTools.createOffering()

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
    data: DevTools.createQuoteData()
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
 * Generates TestVector objects and overwrites the corresponding test vector files in `tbdex`.
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
    const fileLocation = `../../tbdex/hosted/test-vectors/protocol/vectors/${filename}`
    console.log(`Overwriting ${fileLocation} with new test vector.`)
    try {
      fs.writeFileSync(fileLocation, JSON.stringify(vector, null, 2))
    } catch (err) {
      console.error(`Error writing file ${fileLocation}:`, err)
    }
  }
}

overWriteTestVectors()
