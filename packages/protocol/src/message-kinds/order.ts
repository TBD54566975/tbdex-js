import type { MessageKind, MessageModel, OrderData, OrderMetadata } from '../types.js'
import { Message } from '../message.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link Order.create}
 * @beta
 */
export type CreateOrderOptions = {
  metadata: Omit<OrderMetadata, 'id' |'kind' | 'createdAt' | 'protocol'> & { protocol?: OrderMetadata['protocol'] }
}

/**
 * Message sent by Alice to the PFI to accept a Quote.
 * @beta
 */
export class Order extends Message {
  /** a set of valid Message kinds that can come after an order */
  readonly validNext = new Set<MessageKind>(['orderstatus'])
  /** The message kind (order) */
  readonly kind = 'order'

  /** Metadata such as sender, recipient, date created, and ID */
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
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

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
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const order = new Order(metadata, {})
    order.validateData()
    return order
  }
}