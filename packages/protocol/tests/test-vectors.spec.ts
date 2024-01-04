
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Close, Order, OrderStatus, Quote, Rfq } from '../src/message-kinds/index.js'
import { Offering } from '../src/resource-kinds/index.js'
import { loadOrFetchTestVector } from './fetch-test-vectors.js'

chai.use(chaiAsPromised)

describe('Test vectors: parse and serialize', () => {
  it('parse-rfq.json', async () => {
    const testVector = await loadOrFetchTestVector('parse-rfq.json')
    const rfq = await Rfq.parse(testVector.input)
    expect(rfq.toJSON()).to.deep.eq(testVector.output)
  })

  it('parse-order.json', async () => {
    const testVector = await loadOrFetchTestVector('parse-order.json')
    const order = await Order.parse(testVector.input)
    expect(order.toJSON()).to.deep.eq(testVector.output)
  })

  it('parse-orderstatus.json', async () => {
    const testVector = await loadOrFetchTestVector('parse-orderstatus.json')
    const orderstatus = await OrderStatus.parse(testVector.input)
    expect(orderstatus.toJSON()).to.deep.eq(testVector.output)
  })

  it('parse-quote.json', async () => {
    const testVector = await loadOrFetchTestVector('parse-quote.json')
    const quote = await Quote.parse(testVector.input)
    expect(quote.toJSON()).to.deep.eq(testVector.output)
  })

  it('parse-close.json', async () => {
    const testVector = await loadOrFetchTestVector('parse-close.json')
    const close = await Close.parse(testVector.input)
    expect(close.toJSON()).to.deep.eq(testVector.output)
  })

  it('parse-offering.json', async() => {
    const testVector = await loadOrFetchTestVector('parse-offering.json')
    const offering = await Offering.parse(testVector.input)
    expect(offering.toJSON()).to.deep.eq(testVector.output)
  })
})