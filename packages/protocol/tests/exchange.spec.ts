import { BearerDid, DidDht, DidJwk } from '@web5/dids'
import { expect } from 'chai'
import { Cancel, Close, DevTools, Exchange, Message, Order, OrderInstructions, OrderStatus, OrderStatusEnum, Quote, Rfq } from '../src/main.js'

describe('Exchange', () => {
  let aliceDid: BearerDid
  let pfiDid: BearerDid
  let rfq: Rfq
  let quote: Quote
  let cancelByAlice: Cancel
  let closeByPfi: Close
  let order: Order
  let orderInstructions: OrderInstructions
  let orderStatus: OrderStatus

  beforeEach(async () => {
    aliceDid = await DidJwk.create()
    pfiDid = await DidDht.create()

    rfq = Rfq.create({
      metadata: {
        from : aliceDid.uri,
        to   : pfiDid.uri
      },
      data: await DevTools.createRfqData()
    })
    await rfq.sign(aliceDid)

    cancelByAlice = Cancel.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {
        reason: 'I dont like u anymore'
      }
    })
    await cancelByAlice.sign(aliceDid)

    quote = Quote.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: DevTools.createQuoteData()
    })
    await quote.sign(pfiDid)

    closeByPfi = Close.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {
        reason: 'I dont like u anymore'
      }
    })
    await closeByPfi.sign(pfiDid)

    order = Order.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : rfq.metadata.exchangeId
      },
    })
    await order.sign(aliceDid)

    orderInstructions = OrderInstructions.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {
        payin  : { },
        payout : { }
      }
    })
    await order.sign(pfiDid)

    orderStatus = OrderStatus.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId
      },
      data: {
        status: OrderStatusEnum.PayoutSettled
      }
    })
  })

  describe('addMessages', () => {
    it('adds an Rfq', async () => {
      const exchange = new Exchange()
      exchange.addMessages([rfq])

      expect(exchange.rfq).to.deep.eq(rfq)
    })

    it('adds a list of messages in an exchange even if the list is out of order', async () => {
      const exchange = new Exchange()

      // Messages are listed out of order
      exchange.addMessages([order, quote, orderInstructions, orderStatus, rfq])

      expect(exchange.rfq).to.deep.eq(rfq)
      expect(exchange.quote).to.deep.eq(quote)
      expect(exchange.order).to.deep.eq(order)
      expect(exchange.orderInstructions).to.deep.eq(orderInstructions)
      expect(exchange.orderstatus).to.deep.eq([orderStatus])
    })

    it('throws if the messages listed do not form a valid exchange', async () => {
      // scenario: We try to add messages RFQ and Order, without a Quote

      const exchange = new Exchange()
      try {
        exchange.addMessages([rfq, order])
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('is not a valid next message')
      }
    })

    it('throws if the messages listed do not have matching exchange_id', async () => {
      const quote = Quote.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : Message.generateId('rfq')
        },
        data: DevTools.createQuoteData()
      })
      await quote.sign(pfiDid)

      const exchange = new Exchange()
      try {
        exchange.addMessages([rfq, quote])
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('to exchange because it does not have matching exchange id')
      }
    })

    it('throws if the messages listed have timestamp after Close', async () => {
      const close = Close.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : rfq.metadata.exchangeId
        },
        data: {
          reason: 'I dont like u anymore'
        }
      })
      await close.sign(aliceDid)

      const quote = Quote.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : rfq.metadata.exchangeId
        },
        data: DevTools.createQuoteData()
      })
      await quote.sign(pfiDid)

      const exchange = new Exchange()
      try {
        exchange.addMessages([rfq, close, quote])
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('is not a valid next message')
      }
    })
  })

  describe('addNextMessage', () => {
    describe('message sequence', () => {
      it('can add an Rfq first but not other message kinds first', async () => {
        const exchange = new Exchange()
        for (const message of [quote, cancelByAlice, closeByPfi, order, orderInstructions, orderStatus]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }

        exchange.addNextMessage(rfq)
        expect(exchange.rfq).to.deep.eq(rfq)
      })

      it('cannot add an Order, OrderInstructions, OrderStatus, or Rfq after Rfq', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        for (const message of [rfq, order, orderInstructions, orderStatus]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('can add a Quote after Rfq', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        exchange.addNextMessage(quote)
        expect(exchange.quote).to.deep.eq(quote)
      })

      it('can add a Close after Rfq', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('can add a Cancel after Rfq', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        exchange.addNextMessage(cancelByAlice)
        expect(exchange.cancel).to.deep.eq(cancelByAlice)
      })

      it('can add a Close after Quote', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('can add a Cancel after Quote', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])

        exchange.addNextMessage(cancelByAlice)
        expect(exchange.cancel).to.deep.eq(cancelByAlice)
      })

      it('cannot add Rfq, Quote, Order, OrderInstructions, OrderStatus, Close, or Cancel after Close', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])
        exchange.addNextMessage(closeByPfi)

        for (const message of [rfq, quote, order, orderInstructions, orderStatus, closeByPfi, cancelByAlice]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('can add a Close after Cancel', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])
        exchange.addNextMessage(cancelByAlice)

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('can add a OrderStatus after Cancel', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])
        exchange.addNextMessage(cancelByAlice)

        exchange.addNextMessage(orderStatus)
        expect(exchange.orderstatus).to.deep.eq([orderStatus])
      })

      it('cannot add Rfq, Quote, Order, OrderInstructions, or Cancel after Cancel', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])
        exchange.addNextMessage(cancelByAlice)

        for (const message of [rfq, quote, order, orderInstructions, cancelByAlice]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('can add an Order after Quote', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote])

        exchange.addNextMessage(order)
        expect(exchange.order).to.deep.eq(order)
      })

      it('cannot add Rfq, Quote, OrderInstructions or OrderStatus after Quote', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])

        for (const message of [rfq, quote, orderInstructions, orderStatus]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('can add an OrderInstructions or a Close after Order', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote, order])

        exchange.addNextMessage(orderInstructions)
        expect(exchange.orderInstructions).to.deep.eq(orderInstructions)
      })

      it('can add a Close after Order', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote, order])

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('can add a Cancel after Order', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote, order])

        exchange.addNextMessage(cancelByAlice)
        expect(exchange.cancel).to.deep.eq(cancelByAlice)
      })

      it('cannot add Rfq, Quote, Order, or OrderStatus after Order', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote, order])

        for (const message of [rfq, quote, order, orderStatus]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('can add an OrderStatus after OrderInstructions', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote, order, orderInstructions])

        exchange.addNextMessage(orderStatus)
        expect(exchange.orderstatus).to.deep.eq([orderStatus])
      })

      it('can add a Close after OrderInstructions', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote, order, orderInstructions])

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('can add a Cancel after OrderInstructions', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote, order, orderInstructions])

        exchange.addNextMessage(cancelByAlice)
        expect(exchange.cancel).to.deep.eq(cancelByAlice)
      })

      it('can add a Close after OrderStatus', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote, order, orderInstructions, orderStatus])

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('can add a Cancel after OrderStatus', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote, order, orderInstructions, orderStatus])

        exchange.addNextMessage(cancelByAlice)
        expect(exchange.cancel).to.deep.eq(cancelByAlice)
      })

      it('cannot add Rfq, Quote, Order, or OrderInstructions after OrderInstructions', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote, order, orderInstructions])

        for (const message of [rfq, quote, order, orderInstructions]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('cannot add a message if the protocol versions of the new message and the exchange mismatch', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        let quote = Quote.create({
          metadata: {
            from       : pfiDid.uri,
            to         : aliceDid.uri,
            exchangeId : rfq.metadata.exchangeId,
            protocol   : '2.0'
          },
          data: DevTools.createQuoteData()
        })
        await quote.sign(pfiDid)

        try {
          exchange.addNextMessage(quote)
          expect.fail()
        } catch (e) {
          expect(e.message).to.contain('does not have matching protocol version')
          expect(e.message).to.contain(rfq.metadata.protocol)
          expect(e.message).to.contain('1.0')
        }
      })

      it('cannot add a message if the exchangeId of the new message and the exchange mismatch', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        let quote = Quote.create({
          metadata: {
            from       : pfiDid.uri,
            to         : aliceDid.uri,
            exchangeId : '123',

          },
          data: DevTools.createQuoteData()
        })
        await quote.sign(pfiDid)

        try {
          exchange.addNextMessage(quote)
          expect.fail()
        } catch (e) {
          expect(e.message).to.contain('does not have matching exchange id')
          expect(e.message).to.contain(rfq.metadata.exchangeId)
          expect(e.message).to.contain('123')
        }
      })
    })
  })

  describe('messages', () => {
    it('returns the list of messages in the exchange', async () => {

      const rfq = Rfq.create({
        metadata: {
          from : aliceDid.uri,
          to   : pfiDid.uri
        },
        data: await DevTools.createRfqData()
      })
      await rfq.sign(aliceDid)

      const quote = Quote.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : rfq.metadata.exchangeId
        },
        data: DevTools.createQuoteData()
      })
      await quote.sign(pfiDid)

      const order = Order.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : rfq.metadata.exchangeId
        },
      })
      await order.sign(aliceDid)

      const orderInstructions = OrderInstructions.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : rfq.metadata.exchangeId
        },
        data: {
          payin  : { },
          payout : { }
        }
      })
      await order.sign(aliceDid)

      const orderStatus = OrderStatus.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : rfq.metadata.exchangeId
        },
        data: {
          status: OrderStatusEnum.PayoutSettled
        }
      })
      await orderStatus.sign(pfiDid)

      const exchange = new Exchange()
      exchange.addMessages([rfq, quote, order, orderInstructions, orderStatus])

      expect(exchange.messages).to.deep.eq([rfq, quote, order, orderInstructions, orderStatus])
    })
  })
})
