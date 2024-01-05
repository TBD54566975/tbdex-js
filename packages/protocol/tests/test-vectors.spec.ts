import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Close, Order, OrderStatus, Quote, Rfq } from '../src/message-kinds/index.js'
import { Offering } from '../src/resource-kinds/index.js'
import ParseClose from '../test-vectors/parse-close.json' assert { type: 'json' }
import ParseOffering from '../test-vectors/parse-offering.json' assert { type: 'json' }
import ParseOrder from '../test-vectors/parse-order.json' assert { type: 'json' }
import ParseOrderStatus from '../test-vectors/parse-orderstatus.json' assert { type: 'json' }
import ParseQuote from '../test-vectors/parse-quote.json' assert { type: 'json' }
import ParseRfq from '../test-vectors/parse-rfq.json' assert { type: 'json' }

chai.use(chaiAsPromised)

describe('Test vectors: parse and serialize', () => {
  it('parse-close.json', async () => {
    const close = await Close.parse(ParseClose.input)
    expect(close.toJSON()).to.deep.eq(ParseClose.output)
  })

  it('parse-offering.json', async() => {
    const offering = await Offering.parse(ParseOffering.input)
    expect(offering.toJSON()).to.deep.eq(ParseOffering.output)
  })

  it('parse-order.json', async () => {
    const order = await Order.parse(ParseOrder.input)
    expect(order.toJSON()).to.deep.eq(ParseOrder.output)
  })

  it('parse-orderstatus.json', async () => {
    const orderstatus = await OrderStatus.parse(ParseOrderStatus.input)
    expect(orderstatus.toJSON()).to.deep.eq(ParseOrderStatus.output)
  })

  it('parse-quote.json', async () => {
    const quote = await Quote.parse(ParseQuote.input)
    expect(quote.toJSON()).to.deep.eq(ParseQuote.output)
  })

  it('parse-rfq.json', async () => {
    const rfq = await Rfq.parse(ParseRfq.input)
    expect(rfq.toJSON()).to.deep.eq(ParseRfq.output)
  })
})

