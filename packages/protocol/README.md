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
    quoteAmountSubunits : '20000',
    vcs                 : ''
  }
})

await rfq.sign(alice)

console.log(JSON.stringify(rfq, null, 2))
```

## Message Parsing
All messages can be parsed from json into an instance of the Message Kind's class using the `Message.parse` method. e.g.

```typescript
import { Message } from '@tbdex/protocol'

const jsonMessage = "<SERIALIZED_MESSAGE>"
const message = await Message.parse(jsonMessage)

if (message.isRfq()) {
  // rfq specific logic
}
```

Parsing a message includes format validation and integrity checking

## Message Validation
> [!NOTE]
>
> TODO: Fill Out

## Integrity Check
> [!NOTE]
>
> TODO: Fill Out
## Sending Requests
> [!NOTE]
>
> TODO: Fill Out

# Development

## Prerequisites
### `node` and `npm`
This project is using `node v20.3.0` and `npm v9.6.7`. You can verify your `node` and `npm` installation via the terminal:

```
$ node --version
v20.3.0
$ npm --version
9.6.7
```

If you don't have `node` installed. Feel free to choose whichever approach you feel the most comfortable with. If you don't have a preferred installation method, i'd recommend using `nvm` (aka node version manager). `nvm` allows you to install and use different versions of node. It can be installed by running `brew install nvm` (assuming that you have homebrew)

Once you have installed `nvm`, install the desired node version with `nvm install vX.Y.Z`.

## Running Tests
> [!NOTE]
> 
> Make sure you have all the [prerequisites](#prerequisites)

0. clone the repo and `cd` into the project directory
1. Install all project dependencies by running `npm install`
2. run tests using `npm run test:node` to run tests within a nodejs runtime
3. 2. run tests using `npm run test:browser` to run tests within a browser runtime

## `npm` scripts

| Script                 | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `npm run clean`        | deletes `dist` dir and compiled tests                     |
| `npm run test:node`    | runs tests in node runtime                                |
| `npm run test:browser` | runs tests in headless browsers (chrome, safari, firefox) |
| `npm run lint`         | runs linter without auto-fixing                           |
| `npm run lint:fix`     | runs linter and applies automatic fixes wherever possible |
| `npm run build`        | builds all distributions and dumps them into `dist`       |
