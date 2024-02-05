import type { MessageKind, MessageModel, OrderData, OrderMetadata } from '../types.js'
import { Message } from '../message.js'
import { rawToMessageModel } from '../parse.js'

/**
 * Options passed to {@link Order.create}
 * @beta
 */
export type CreateOrderOptions = {
  metadata: Omit<OrderMetadata, 'id' |'kind' | 'createdAt'>
}

/**
 * Message sent by Alice to the PFI to accept a Quote.
 * @beta
 */
export class Order extends Message {
  /** a set of valid Message kinds that can come after an order */
  readonly validNext = new Set<MessageKind>(['orderstatus'])
  /** @inheritdoc */
  readonly kind = 'order'

  /** @inheritdoc */
  readonly metadata: OrderMetadata
  /** Order's data */
  readonly data: OrderData

  constructor(metadata: OrderMetadata, data: OrderData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json message into an Order
   * @param rawMessage - the order to parse
   * @throws if the order could not be parsed or is not a valid Order
   * @returns The parsed Order
   */
  static async parse(rawMessage: MessageModel | string): Promise<Order> {
    const jsonMessage = rawToMessageModel(rawMessage)

    const order = new Order(
      jsonMessage.metadata as OrderMetadata,
      jsonMessage.data as OrderData,
      jsonMessage.signature
    )

    await order.verify()
    return order
  }

  /**
   * Creates an order with the given options
   * @param opts - options to create an order
   */
  static create(opts: CreateOrderOptions): Order {
    const metadata: OrderMetadata = {
      ...opts.metadata,
      kind      : 'order',
      id        : Message.generateId('order'),
      createdAt : new Date().toISOString()
    }

    const order = new Order(metadata, {})
    order.validateData()
    return order
  }
}