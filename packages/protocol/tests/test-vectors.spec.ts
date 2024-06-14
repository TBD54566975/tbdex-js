import { expect } from 'chai'
import ParseClose from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-close.json' assert { type: 'json' }
import ParseOffering from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-offering.json' assert { type: 'json' }
import ParseOrder from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-order.json' assert { type: 'json' }
import ParseOrderStatus from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-orderstatus.json' assert { type: 'json' }
import ParseQuote from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-quote.json' assert { type: 'json' }
import ParseRfq from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-rfq.json' assert { type: 'json' }
import ParseOmitPrivateData from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-rfq-omit-private-data.json' assert { type: 'json' }
import ParseBalance from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-balance.json' assert { type: 'json' }
import { Balance, Close, Offering, Order, OrderStatus, Quote, Rfq } from '../src/main.js'
import { Parser } from '../src/parser.js'

describe('TbdexTestVectorsProtocol', function () {
  this.timeout(20000) // Increase the timeout to 20 seconds for all tests

  it('parse_close', function (done) {
    (async () => {
      try {
        console.log('Starting parse_close test')
        const message = await Parser.parseMessage(ParseClose.input)
        console.log('Parsed message')
        expect(message.isClose()).to.be.true
        expect(message.toJSON()).to.deep.eq(ParseClose.output)

        const close = await Close.parse(ParseClose.input)
        console.log('Parsed close')
        expect(close.isClose()).to.be.true
        expect(close.toJSON()).to.deep.eq(ParseClose.output)
        console.log('Finished parse_close test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_offering', function (done) {
    (async () => {
      try {
        console.log('Starting parse_offering test')
        const resource = await Parser.parseResource(ParseOffering.input)
        console.log('Parsed resource')
        expect(resource.isOffering()).to.be.true
        expect(resource.toJSON()).to.deep.eq(ParseOffering.output)

        const offering = await Offering.parse(ParseOffering.input)
        console.log('Parsed offering')
        expect(offering.isOffering()).to.be.true
        expect(offering.toJSON()).to.deep.eq(ParseOffering.output)
        console.log('Finished parse_offering test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_order', function (done) {
    (async () => {
      try {
        console.log('Starting parse_order test')
        const message = await Parser.parseMessage(ParseOrder.input)
        console.log('Parsed message')
        expect(message.isOrder()).to.be.true
        expect(message.toJSON()).to.deep.eq(ParseOrder.output)

        const order = await Order.parse(ParseOrder.input)
        console.log('Parsed order')
        expect(order.isOrder()).to.be.true
        expect(order.toJSON()).to.deep.eq(ParseOrder.output)
        console.log('Finished parse_order test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_orderstatus', function (done) {
    (async () => {
      try {
        console.log('Starting parse_orderstatus test')
        const message = await Parser.parseMessage(ParseOrderStatus.input)
        console.log('Parsed message')
        expect(message.isOrderStatus()).to.be.true
        expect(message.toJSON()).to.deep.eq(ParseOrderStatus.output)

        const orderstatus = await OrderStatus.parse(ParseOrderStatus.input)
        console.log('Parsed orderstatus')
        expect(orderstatus.isOrderStatus()).to.be.true
        expect(orderstatus.toJSON()).to.deep.eq(ParseOrderStatus.output)
        console.log('Finished parse_orderstatus test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_quote', function (done) {
    (async () => {
      try {
        console.log('Starting parse_quote test')
        const message = await Parser.parseMessage(ParseQuote.input)
        console.log('Parsed message')
        expect(message.isQuote()).to.be.true
        expect(message.toJSON()).to.deep.eq(ParseQuote.output)

        const quote = await Quote.parse(ParseQuote.input)
        console.log('Parsed quote')
        expect(quote.isQuote()).to.be.true
        expect(quote.toJSON()).to.deep.eq(ParseQuote.output)
        console.log('Finished parse_quote test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_rfq', function (done) {
    (async () => {
      try {
        console.log('Starting parse_rfq test')
        const message = await Parser.parseMessage(ParseRfq.input)
        console.log('Parsed message')
        expect(message.isRfq()).to.be.true
        expect(message.toJSON()).to.deep.eq(ParseRfq.output)

        const rfq = await Rfq.parse(ParseRfq.input)
        console.log('Parsed rfq')
        expect(rfq.isRfq()).to.be.true
        expect(rfq.toJSON()).to.deep.eq(ParseRfq.output)
        console.log('Finished parse_rfq test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_rfq_omit_private_data', function (done) {
    (async () => {
      try {
        console.log('Starting parse_rfq_omit_private_data test')
        const message = await Parser.parseMessage(ParseOmitPrivateData.input)
        console.log('Parsed message')
        expect(message.isRfq()).to.be.true
        expect(message.toJSON()).to.deep.eq(ParseOmitPrivateData.output)

        const rfq = await Rfq.parse(ParseOmitPrivateData.input)
        console.log('Parsed rfq')
        expect(rfq.isRfq()).to.be.true
        expect(rfq.toJSON()).to.deep.eq(ParseOmitPrivateData.output)
        console.log('Finished parse_rfq_omit_private_data test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })

  it('parse_balance', function (done) {
    (async () => {
      try {
        console.log('Starting parse_balance test')
        const resource = await Parser.parseResource(ParseBalance.input)
        console.log('Parsed resource')
        expect(resource.isBalance()).to.be.true
        expect(resource.toJSON()).to.deep.eq(ParseBalance.output)

        const balance = await Balance.parse(ParseBalance.input)
        console.log('Parsed balance')
        expect(balance.isBalance()).to.be.true
        expect(balance.toJSON()).to.deep.eq(ParseBalance.output)
        console.log('Finished parse_balance test')
        done()
      } catch (error) {
        done(error)
      }
    })()
  })
})
