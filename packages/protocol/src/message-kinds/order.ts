import type { MessageKind, MessageMetadata } from '../types.js'
import { Message } from '../message.js'

/**
 * Options passed to {@link Order.create}
 * @beta
 */
export type CreateOrderOptions = {
  metadata: Omit<MessageMetadata<'order'>, 'id' |'kind' | 'createdAt'>
  private?: Record<string, any>
}

/**
 * Message sent by Alice to the PFI to accept a Quote.
 * @beta
 */
export class Order extends Message<'order'> {
  /** a set of valid Message kinds that can come after an order */
  readonly validNext = new Set<MessageKind>(['orderstatus'])

  /**
   * Creates an order with the given options
   * @param opts - options to create an order
   */
  static create(opts: CreateOrderOptions) {
    const metadata: MessageMetadata<'order'> = {
      ...opts.metadata,
      kind      : 'order' as const,
      id        : Message.generateId('order'),
      createdAt : new Date().toISOString()
    }

    const message = { metadata, data: {} }
    Message.validateData('order', message.data)
    return new Order(message)
  }
}