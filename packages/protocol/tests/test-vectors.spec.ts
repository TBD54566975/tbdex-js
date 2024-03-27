import { expect } from 'chai'
import ParseClose from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-close.json' assert { type: 'json' }
import ParseOffering from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-offering.json' assert { type: 'json' }
import ParseOrder from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-order.json' assert { type: 'json' }
import ParseOrderStatus from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-orderstatus.json' assert { type: 'json' }
import ParseQuote from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-quote.json' assert { type: 'json' }
import ParseRfq from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-rfq.json' assert { type: 'json' }
import { Close, Offering, Order, OrderStatus, Quote, Rfq } from '../src/main.js'
import { Parser } from '../src/parser.js'

describe('TbdexTestVectorsProtocol', function () {
  this.timeout(10000)
  it('parse_close', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseClose.input)
    expect(message.isClose()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseClose.output)

    // Parse with Close.parse()
    const close = await Close.parse(ParseClose.input)
    expect(close.isClose()).to.be.true
    expect(close.toJSON()).to.deep.eq(ParseClose.output)
  })

  it.skip('parse_offering', async() => {
    // Parse with parseResource()
    const resource = await Parser.parseResource(ParseOffering.input)
    expect(resource.isOffering()).to.be.true
    expect(resource.toJSON()).to.deep.eq(ParseOffering.output)

    // Parse with Offering.parse()
    const offering = await Offering.parse(ParseOffering.input)
    expect(offering.isOffering()).to.be.true
    expect(offering.toJSON()).to.deep.eq(ParseOffering.output)
  })

  it('parse_order', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseOrder.input)
    expect(message.isOrder()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseOrder.output)

    // Parse with Order.parse()
    const order = await Order.parse(ParseOrder.input)
    expect(order.isOrder()).to.be.true
    expect(order.toJSON()).to.deep.eq(ParseOrder.output)
  })

  it('parse_orderstatus', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseOrderStatus.input)
    expect(message.isOrderStatus()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseOrderStatus.output)

    // Parse with OrderStatus.parse()
    const orderstatus = await OrderStatus.parse(ParseOrderStatus.input)
    expect(orderstatus.isOrderStatus()).to.be.true
    expect(orderstatus.toJSON()).to.deep.eq(ParseOrderStatus.output)
  })

  it('parse_quote', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseQuote.input)
    expect(message.isQuote()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseQuote.output)

    // Parse with Quote.parse()
    const quote = await Quote.parse(ParseQuote.input)
    expect(quote.isQuote()).to.be.true
    expect(quote.toJSON()).to.deep.eq(ParseQuote.output)
  })

  it.skip('parse_rfq', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseRfq.input)
    expect(message.isRfq()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseRfq.output)

    // Parse with Rfq.parse()
    const rfq = await Rfq.parse(ParseRfq.input)
    expect(rfq.isRfq()).to.be.true
    expect(rfq.toJSON()).to.deep.eq(ParseRfq.output)
  })
})
