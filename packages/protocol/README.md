# tbDEX Protocol <!-- omit in toc -->

Library that can be used to create, parse, verify, and validate the tbDEX Messages and Resources defined in the [protocol specification](https://github.com/TBD54566975/tbdex-protocol/blob/main/README.md)
# Table of Contents <!-- omit in toc -->
- [Installation](#installation)
- [Usage](#usage)
  - [Message Creation](#message-creation)
  - [Message Parsing](#message-parsing)
  - [Message Validation](#message-validation)
  - [Integrity Check](#integrity-check)
  - [Sending Requests](#sending-requests)
- [Development](#development)
  - [Prerequisites](#prerequisites)
    - [`node` and `npm`](#node-and-npm)
  - [Running Tests](#running-tests)
  - [`npm` scripts](#npm-scripts)


# Installation

```bash
npm install @tbdex/protocol
```

# Usage

## Message Creation
There's a concrete class for each [Message Kind](https://github.com/TBD54566975/tbdex-protocol/blob/main/README.md#message-kinds). These classes can be used to create messages. e.g. 
```typescript
import { DevTools, Rfq } from '@tbdex/protocol'

const rfq = Rfq.create({
  metadata : { from: alice.did, to: 'did:ex:pfi' },
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
    payinAmount : '200.00',
    claims      : ['']
  }
})

await rfq.sign(alice)

console.log(JSON.stringify(rfq, null, 2))
```

## Message Parsing
All messages can be parsed from json into an instance of the Message Kind's class using the `parseMessage` method. e.g.

```typescript
import { parseMessage } from '@tbdex/protocol'

const jsonMessage = "<SERIALIZED_MESSAGE>"
const message = await parseMessage(jsonMessage)

if (message.isRfq()) {
  // rfq specific logic
}
```

If you know what kind of message you are expecting, you can use a message kind specific `.parse()` method. e.g.

```typescript
import { Rfq, Quote } from '@tbdex/protocol'

const jsonRfq = "<SERIALIZED_RFQ>"
const rfq = Rfq.parse(jsonRfq)

const jsonQuote = "<SERIALIZED_QUOTE>"
const quote = Quote.parse(jsonQuote)
```

Parsing a message includes format validation, signature integrity checking, and other validations specific to each message kind.

## Message Validation and Verification
Given an instance of a `Message` or `Resource`, you can perform validations with different levels of granularity.

- `Message#verify()` performs format validation, a signature integrity check, and validations specific to a each message kind. However, it does NOT perform validations that require knowledge of other messages in an exchange.
- `Message#verifySignature()` performs a signature integrity check.
- `Message#validate()` performs a format validation against the official TBDex JSON Schemas. It will fail if the message has not yet been signed.

### Rfq Validation
An `Rfq` must also be validated against its corresponding `Offering`.

```typescript
import { Offering, Rfq } from '@tbdex/protocol'

const offering = Offering.parse("<SERIALIZED_OFFERING>")
const rfq = Rfq.parse("<SERIALIZED_RFQ>")
await rfq.verifyOfferingRequirements(offering)
```
