import { Rfq } from './rfq.js'
import { Quote } from './quote.js'
import { Order } from './order.js'
import { OrderStatus } from './order-status.js'
import { Close } from './close.js'

export * from './rfq.js'
export * from './quote.js'
export * from './order.js'
export * from './order-status.js'
export * from './close.js'

/**
 * Type alias for all message kinds classes
 * @beta
 */
export type MessageKindClass = Rfq | Quote | Order | OrderStatus | Close

/**
 * Type alias for all message kinds classes mapped by string keys
 * @beta
 */
export type MessageKindClasses = {
  'rfq': Rfq
  'quote': Quote
  'order': Order
  'orderstatus': OrderStatus
  'close': Close
}

