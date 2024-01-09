import testVectors from './test-vectors.json' assert { type: 'json' }
import { Close, Offering, Order, OrderStatus, Quote, Rfq } from '../src/main.js'

describe('Test vectors', () => {
  describe('resources', () => {
    describe('offerings', () => {
      it('sucesfully parses', async () => {
        const vector = testVectors.resources.offering
        await Offering.parse(vector as any)
      })
    })
  })

  describe('messages', () => {
    describe('rfq', () => {
      it('successfully parses', async () => {
        const vector = testVectors.messages.rfq
        await Rfq.parse(vector as any)
      })
    })

    describe('quote', () => {
      it('successfully parses', async () => {
        const vector = testVectors.messages.quote
        await Quote.parse(vector as any)
      })
    })

    describe('order', () => {
      it('successfully parses', async () => {
        const vector = testVectors.messages.order
        await Order.parse(vector as any)
      })
    })

    describe('orderstatus', () => {
      it('successfully parses', async () => {
        const vector = testVectors.messages.orderStatus
        await OrderStatus.parse(vector as any)
      })
    })

    describe('close', () => {
      it('successfully parses', async () => {
        const vector = testVectors.messages.close
        await Close.parse(vector as any)
      })
    })
  })
})