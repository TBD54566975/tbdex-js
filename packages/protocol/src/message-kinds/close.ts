import type { CloseData, CloseMetadata, MessageKind, MessageModel } from '../types.js'
import { Message } from '../message.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link OrderStatus.create}
 * @beta
 */
export type CreateCloseOptions = {
  data: CloseData
  metadata: Omit<CloseMetadata, 'id' | 'kind' | 'createdAt' | 'protocol'> & { protocol?: CloseMetadata['protocol'] }
}

/**
 * A Close can be sent by Alice or the PFI as a reply to an RFQ or a Quote
 * @beta
 */
export class Close extends Message {
  /** A set of valid Message kinds that can come after a close */
  readonly validNext = new Set<MessageKind>([])
  /** The message kind (close) */
  readonly kind = 'close'

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: CloseMetadata
  /** Close's data containing a reason why the exchange was closed */
  readonly data: CloseData

  constructor(metadata: CloseMetadata, data: CloseData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json message into an Close
   * @param rawMessage - the close to parse
   * @throws if the close could not be parsed or is not a valid Close
   * @returns The parsed Close
   */
  static async parse(rawMessage: MessageModel | string): Promise<Close> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const close = new Close(
      jsonMessage.metadata as CloseMetadata,
      jsonMessage.data as CloseData,
      jsonMessage.signature
    )

    await close.verify()
    return close
  }

  /**
   * Creates a close message with the given options
   * @param opts - options to create a close message
   */
  static create(opts: CreateCloseOptions): Close {
    const metadata: CloseMetadata = {
      ...opts.metadata,
      kind      : 'close',
      id        : Message.generateId('close'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const close = new Close(metadata, opts.data)
    close.validateData()
    return close
  }

  /** an explanation of why the exchange is being closed */
  get reason() {
    return this.data.reason
  }
}