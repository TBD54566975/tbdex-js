import type { MessageKind, MessageModel, OrderStatusData, OrderStatusMetadata } from '../types.js'
import { Message } from '../message.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link OrderStatus.create}
 * @beta
 */
export type CreateOrderStatusOptions = {
  data: OrderStatusData
  metadata: Omit<OrderStatusMetadata, 'id' |'kind' | 'createdAt' | 'protocol'> & { protocol?: OrderStatusMetadata['protocol'] }
}

/**
 * Sent by the PFI to Alice to convey the current status of an order. There can be many OrderStatus
 * messages in a given Exchange
 * @beta
 */
export class OrderStatus extends Message {
  /** a set of valid Message kinds that can come after an order status */
  readonly validNext = new Set<MessageKind>(['orderstatus', 'close'])
  /** The message kind (orderstatus) */
  readonly kind = 'orderstatus'

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: OrderStatusMetadata
  /** OrderStatus's data containing a description of the status */
  readonly data: OrderStatusData

  constructor(metadata: OrderStatusMetadata, data: OrderStatusData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json message into an OrderStatus
   * @param rawMessage - the orderstatus to parse
   * @throws if the orderstatus could not be parsed or is not a valid OrderStatus
   * @returns The parsed OrderStatus
   */
  static async parse(rawMessage: MessageModel | string): Promise<OrderStatus> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const orderStatus = new OrderStatus(
      jsonMessage.metadata as OrderStatusMetadata,
      jsonMessage.data as OrderStatusData,
      jsonMessage.signature
    )

    await orderStatus.verify()
    return orderStatus
  }

  /**
   * Creates an order status with the given options
   * @param opts - options to create an order status
   */
  static create(opts: CreateOrderStatusOptions): OrderStatus {
    const metadata: OrderStatusMetadata = {
      ...opts.metadata,
      kind      : 'orderstatus',
      id        : Message.generateId('orderstatus'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const orderStatus = new OrderStatus(metadata, opts.data)
    orderStatus.validateData()
    return orderStatus
  }

  /** Current status of Order that's being executed (e.g. PROCESSING, COMPLETED, FAILED etc.) */
  get orderStatus() {
    return this.data.orderStatus
  }
}