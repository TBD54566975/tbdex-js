import { expect } from 'chai'
import ParseClose from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-close.json' assert { type: 'json' }
import ParseOffering from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-offering.json' assert { type: 'json' }
import ParseOrder from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-order.json' assert { type: 'json' }
import ParseOrderStatus from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-orderstatus.json' assert { type: 'json' }
import ParseQuote from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-quote.json' assert { type: 'json' }
import ParseRfq from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-rfq.json' assert { type: 'json' }
import ParseOmitPrivateData from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-rfq-omit-private-data.json' assert { type: 'json' }
import ParseBalance from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-balance.json' assert { type: 'json' }
import { Balance, Close, Message, Offering, Order, OrderStatus, Quote, Resource, Rfq } from '../src/main.js'
import { Parser } from '../src/parser.js'
import Sinon from 'sinon'

describe('TbdexTestVectorsProtocol', function () {
  let messageVerifyStub: Sinon.SinonStub
  let resourceVerifyStub: Sinon.SinonStub

  beforeEach(function() {
    // Our intent here is to test the overall parsing logic,
    // so stub the signature verify methods to avoid real DID resolution over the network which can take more than 10 seconds for DID DHT
    messageVerifyStub = Sinon.stub(Message.prototype, 'verify')
    resourceVerifyStub = Sinon.stub(Resource.prototype, 'verify')
  })

  afterEach(function() {
    // Restore the original method
    messageVerifyStub.restore()
    resourceVerifyStub.restore()
  })

  it('parse_close', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseClose.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(message.isClose()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseClose.output)
    messageVerifyStub.resetHistory()

    // Parse with Close.parse()
    const close = await Close.parse(ParseClose.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(close.isClose()).to.be.true
    expect(close.toJSON()).to.deep.eq(ParseClose.output)
  })

  it('parse_offering', async() => {
    // Parse with parseResource()
    const resource = await Parser.parseResource(ParseOffering.input)
    expect(resourceVerifyStub.calledOnce).to.be.true
    expect(resource.isOffering()).to.be.true
    expect(resource.toJSON()).to.deep.eq(ParseOffering.output)
    resourceVerifyStub.resetHistory()

    // Parse with Offering.parse()
    const offering = await Offering.parse(ParseOffering.input)
    expect(resourceVerifyStub.calledOnce).to.be.true
    expect(offering.isOffering()).to.be.true
    expect(offering.toJSON()).to.deep.eq(ParseOffering.output)
  })

  it('parse_order', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseOrder.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(message.isOrder()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseOrder.output)
    messageVerifyStub.resetHistory()

    // Parse with Order.parse()
    const order = await Order.parse(ParseOrder.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(order.isOrder()).to.be.true
    expect(order.toJSON()).to.deep.eq(ParseOrder.output)
  })

  it('parse_orderstatus', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseOrderStatus.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(message.isOrderStatus()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseOrderStatus.output)
    messageVerifyStub.resetHistory()

    // Parse with OrderStatus.parse()
    const orderstatus = await OrderStatus.parse(ParseOrderStatus.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(orderstatus.isOrderStatus()).to.be.true
    expect(orderstatus.toJSON()).to.deep.eq(ParseOrderStatus.output)
  })

  it('parse_quote', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseQuote.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(message.isQuote()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseQuote.output)
    messageVerifyStub.resetHistory()

    // Parse with Quote.parse()
    const quote = await Quote.parse(ParseQuote.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(quote.isQuote()).to.be.true
    expect(quote.toJSON()).to.deep.eq(ParseQuote.output)
  })

  it('parse_rfq', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseRfq.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(message.isRfq()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseRfq.output)
    messageVerifyStub.resetHistory()

    // Parse with Rfq.parse()
    const rfq = await Rfq.parse(ParseRfq.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(rfq.isRfq()).to.be.true
    expect(rfq.toJSON()).to.deep.eq(ParseRfq.output)
  })

  it('parse_rfq_omit_private_data', async () => {
    // Parse with parseMessage()
    const message = await Parser.parseMessage(ParseOmitPrivateData.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(message.isRfq()).to.be.true
    expect(message.toJSON()).to.deep.eq(ParseOmitPrivateData.output)
    messageVerifyStub.resetHistory()

    // Parse with Rfq.parse()
    const rfq = await Rfq.parse(ParseOmitPrivateData.input)
    expect(messageVerifyStub.calledOnce).to.be.true
    expect(rfq.isRfq()).to.be.true
    expect(rfq.toJSON()).to.deep.eq(ParseOmitPrivateData.output)
  })

  it('parse_balance', async () => {
    // Parse with parseResource()
    const resource = await Parser.parseResource(ParseBalance.input)
    expect(resourceVerifyStub.calledOnce).to.be.true
    expect(resource.isBalance()).to.be.true
    expect(resource.toJSON()).to.deep.eq(ParseBalance.output)
    resourceVerifyStub.resetHistory()

    // Parse with Balance.parse()
    const balance = await Balance.parse(ParseBalance.input)
    expect(resourceVerifyStub.calledOnce).to.be.true
    expect(balance.isBalance()).to.be.true
    expect(balance.toJSON()).to.deep.eq(ParseBalance.output)
  })
})
