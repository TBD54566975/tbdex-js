import { expect } from 'chai'
import { Close, Order, OrderStatus, Quote, Rfq } from '../src/message-kinds/index.js'
import { Offering } from '../src/resource-kinds/index.js'
import ParseClose from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-close.json' assert { type: 'json' }
import ParseOffering from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-offering.json' assert { type: 'json' }
import ParseOrder from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-order.json' assert { type: 'json' }
import ParseOrderStatus from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-orderstatus.json' assert { type: 'json' }
import ParseQuote from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-quote.json' assert { type: 'json' }
import ParseRfq from '../../../tbdex/hosted/test-vectors/protocol/vectors/parse-rfq.json' assert { type: 'json' }

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
