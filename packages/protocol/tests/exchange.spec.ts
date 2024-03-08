import { BearerDid, DidDht, DidJwk } from '@web5/dids'
import { expect } from 'chai'
import { Close, DevTools, Exchange, Message, Order, OrderStatus, Quote, Rfq } from '../src/main.js'

describe('Exchange', () => {
  let aliceDid: BearerDid
  let pfiDid: BearerDid
  let rfq: Rfq
  let quote: Quote
  let closeByAlice: Close
  let closeByPfi: Close
  let order: Order
  let orderStatus: OrderStatus

  beforeEach(async () => {
    aliceDid = await DidJwk.create()
    pfiDid = await DidDht.create()

    rfq = Rfq.create({
      metadata: {
        from     : aliceDid.uri,
        to       : pfiDid.uri,
        protocol : '1.0'
      },
      data: await DevTools.createRfqData()
    })
    await rfq.sign(aliceDid)

    closeByAlice = Close.create({
      metadata: {
        from       : aliceDid.uri,
        to         : pfiDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
      data: {
        reason: 'I dont like u anymore'
      }
    })
    await closeByAlice.sign(aliceDid)

    quote = Quote.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
      data: DevTools.createQuoteData()
    })
    await quote.sign(pfiDid)

    closeByPfi = Close.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
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
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
    })
    await order.sign(aliceDid)

    orderStatus = OrderStatus.create({
      metadata: {
        from       : pfiDid.uri,
        to         : aliceDid.uri,
        exchangeId : rfq.metadata.exchangeId,
        protocol   : '1.0'
      },
      data: {
        orderStatus: 'Done'
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
      exchange.addMessages([order, quote, orderStatus, rfq])

      expect(exchange.rfq).to.deep.eq(rfq)
      expect(exchange.quote).to.deep.eq(quote)
      expect(exchange.order).to.deep.eq(order)
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
          exchangeId : Message.generateId('rfq'),
          protocol   : '1.0'
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
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
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
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
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
        for (const message of [quote, closeByAlice, closeByPfi, order, orderStatus]) {
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

      it('cannot add an Order, OrderStatus, or Rfq after Rfq', async () => {
        const exchange = new Exchange()
        exchange.addNextMessage(rfq)

        for (const message of [rfq, order, orderStatus]) {
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

        exchange.addNextMessage(closeByAlice)
        expect(exchange.close).to.deep.eq(closeByAlice)
      })

      it('can add a Close after Quote', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])

        exchange.addNextMessage(closeByPfi)
        expect(exchange.close).to.deep.eq(closeByPfi)
      })

      it('cannot add Rfq, Quote, Order, OrderStatus, or Close after Close', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])
        exchange.addNextMessage(closeByAlice)

        for (const message of [rfq, quote, order, orderStatus, closeByAlice]) {
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

      it('cannot add Rfq, Quote, or OrderStatus after Quote', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote])

        for (const message of [rfq, quote, orderStatus]) {
          try {
            exchange.addNextMessage(message)
            expect.fail()
          } catch (e) {
            expect(e.message).to.contain('is not a valid next message')
          }
        }
      })

      it('can add an OrderStatus after Order', async () => {
        const exchange = new Exchange()

        exchange.addMessages([rfq, quote, order])

        exchange.addNextMessage(orderStatus)
        expect(exchange.orderstatus).to.deep.eq([orderStatus])
      })

      it('cannot add Rfq, Quote, Order, or Close after Order', async () => {
        const exchange = new Exchange()
        exchange.addMessages([rfq, quote, order])

        for (const message of [rfq, quote, order, closeByAlice]) {
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
            protocol   : '1.0'
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
          from     : aliceDid.uri,
          to       : pfiDid.uri,
          protocol : '1.0'
        },
        data: await DevTools.createRfqData()
      })
      await rfq.sign(aliceDid)

      const quote = Quote.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
        },
        data: DevTools.createQuoteData()
      })
      await quote.sign(pfiDid)

      const order = Order.create({
        metadata: {
          from       : aliceDid.uri,
          to         : pfiDid.uri,
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
        },
      })
      await order.sign(aliceDid)

      const orderStatus = OrderStatus.create({
        metadata: {
          from       : pfiDid.uri,
          to         : aliceDid.uri,
          exchangeId : rfq.metadata.exchangeId,
          protocol   : '1.0'
        },
        data: {
          orderStatus: 'Done'
        }
      })
      await orderStatus.sign(pfiDid)

      const exchange = new Exchange()
      exchange.addMessages([rfq, quote, order, orderStatus])

      expect(exchange.messages).to.deep.eq([rfq, quote, order, orderStatus])
    })
  })
})
