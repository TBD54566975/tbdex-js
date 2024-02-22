import { VerifiableCredential } from '@web5/credentials'
import { Close, DevTools, Message, Order, OrderStatus, Quote, Resource, Rfq } from '../src/main.js'
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
  const pfiDid = await await DevTools.createDid('dht')
  const offering = DevTools.createOffering({ from: pfiDid.uri })

  await offering.sign(pfiDid)

  return {
    description : 'Offering parses from string',
    input       : JSON.stringify(offering.toJSON()),
    output      : offering.toJSON(),
    error       : false,
  }
}

const generateParseQuoteVector = async () => {
  const pfiDid = await DevTools.createDid('dht')
  const quote = Quote.create({
    metadata: {
      exchangeId : Message.generateId('rfq'),
      from       : pfiDid.uri,
      to         : 'did:ex:pfi'
    },
    data: DevTools.createQuoteData()
  })
  await quote.sign(pfiDid)

  return {
    description : 'Quote parses from string',
    input       : JSON.stringify(quote.toJSON()),
    output      : quote.toJSON(),
    error       : false,
  }
}

const generateParseRfqVector = async () => {
  const aliceDid = await DevTools.createDid()
  const vc = await VerifiableCredential.create({
    type    : 'PuupuuCredential',
    issuer  : aliceDid.uri,
    subject : aliceDid.uri,
    data    : {
      'beep': 'boop'
    }
  })

  const vcJwt = await vc.sign({ did: aliceDid })

  const rfq = Rfq.create({
    metadata : { from: aliceDid.uri, to: 'did:ex:pfi' },
    data     : {
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
      payinAmount : '20000.00',
      claims      : [vcJwt]
    }
  })

  await rfq.sign(aliceDid)

  return {
    description : 'RFQ parses from string',
    input       : JSON.stringify(rfq.toJSON()),
    output      : rfq.toJSON(),
    error       : false,
  }
}

const generateParseOrderVector = async () => {
  const aliceDid = await DevTools.createDid()
  const order = Order.create({
    metadata: { from: aliceDid.uri, to: 'did:ex:pfi', exchangeId: Message.generateId('rfq'), externalId: 'ext_1234' }
  })

  await order.sign(aliceDid)

  return {
    description : 'Order parses from string',
    input       : JSON.stringify(order),
    output      : order.toJSON(),
    error       : false,
  }
}

const generateParseCloseVector = async () => {
  const pfiDid = await DevTools.createDid('dht')
  const aliceDid = await DevTools.createDid('dht')
  const close = Close.create({
    metadata: {
      from       : pfiDid.uri,
      to         : aliceDid.uri,
      exchangeId : Message.generateId('rfq')
    },
    data: {
      reason: 'The reason for closing the exchange'
    }
  })

  await close.sign(pfiDid)

  return {
    description : 'Close parses from string',
    input       : JSON.stringify(close),
    output      : close.toJSON(),
    error       : false,
  }
}

const generateParseOrderStatusVector = async () => {
  const pfiDid = await DevTools.createDid()
  const orderStatus = OrderStatus.create({
    metadata : { from: pfiDid.uri, to: 'did:ex:alice', exchangeId: Message.generateId('rfq') },
    data     : {
      orderStatus: 'wee'
    }
  })

  await orderStatus.sign(pfiDid)

  return {
    description : 'Order Status parses from string',
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
