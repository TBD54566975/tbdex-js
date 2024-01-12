import { DevTools, Message, Offering, Quote, Rfq } from '../src/main.js'

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
  const did = await DevTools.createDid()
  const offering = Offering.create({
    metadata : { from: did.did },
    data     : DevTools.createOfferingData()
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
  const did = await DevTools.createDid()
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
  const did = await DevTools.createDid()
  const rfq = Rfq.create({
    metadata : { from: did.did, to: 'did:ex:pfi' },
    data     : await DevTools.createRfqData()
  })

  await rfq.sign(did)

  return {
    description : 'RFQ parses from string',
    input       : JSON.stringify(rfq.toJSON()),
    output      : rfq.toJSON(),
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
    { filename: 'parse-rfq.json', vector: await generateParseRfqVector() }
  ]

  for (const { filename, vector } of vectorFilePair) {
    console.log(filename)
    console.log(JSON.stringify(vector, null, 2))
  }
}

overWriteTestVectors()
