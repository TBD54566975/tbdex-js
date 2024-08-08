import type { MessageKind, MessageModel, OrderInstructionsData, OrderInstructionsMetadata } from '../types.js'
import { Message } from '../message.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link OrderInstructions.create}
 * @beta
 */
export type CreateOrderInstructionsOptions = {
  data: OrderInstructionsData
  metadata: Omit<OrderInstructionsMetadata, 'id' |'kind' | 'createdAt' | 'protocol'> & { protocol?: OrderInstructionsMetadata['protocol'] }
}

/**
 * Sent by the PFI to Alice to convey payment instructions.
 * @beta
 */
export class OrderInstructions extends Message {
  /** A set of valid Message kinds that can come after an Order Instructions */
  readonly validNext = new Set<MessageKind>(['orderstatus', 'close'])

  /** The message kind `orderinstructions`. */
  readonly kind = 'orderinstructions'

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: OrderInstructionsMetadata

  /** OrderInstructions' specific data containing payin and payout instructions  */
  readonly data: OrderInstructionsData

  constructor(metadata: OrderInstructionsMetadata, data: OrderInstructionsData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a JSON message into an OrderInstructions.
   * @param rawMessage - The OrderInstructions to parse.
   * @throws Error if the OrderInstructions could not be parsed or is not a valid OrderInstructions.
   * @returns The parsed OrderInstructions.
   */
  static async parse(rawMessage: MessageModel | string): Promise<OrderInstructions> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const orderInstructions = new OrderInstructions(
      jsonMessage.metadata as OrderInstructionsMetadata,
      jsonMessage.data as OrderInstructionsData,
      jsonMessage.signature
    )

    await orderInstructions.verify()
    return orderInstructions
  }

  /**
   * Creates an OrderInstructions with the given options.
   * @param opts - Options to create an OrderInstructions.
   */
  static create(opts: CreateOrderInstructionsOptions): OrderInstructions {
    const metadata: OrderInstructionsMetadata = {
      ...opts.metadata,
      kind      : 'orderinstructions',
      id        : Message.generateId('orderinstructions'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const orderInstructions = new OrderInstructions(metadata, opts.data)
    orderInstructions.validateData()
    return orderInstructions
  }
}