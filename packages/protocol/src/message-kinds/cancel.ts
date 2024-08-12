import type { MessageKind, MessageModel, CancelData, CancelMetadata } from '../types.js'
import { Message } from '../message.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link Cancel.create}
 * @beta
 */
export type CreateCancelOptions = {
  data: CancelData
  metadata: Omit<CancelMetadata, 'id' |'kind' | 'createdAt' | 'protocol'> & { protocol?: CancelMetadata['protocol'] }
}

/**
 * Sent by Alice to indicate that she does not wish to further propagate the exchange, and get a refund if applicable.
 * @beta
 */
export class Cancel extends Message {
  /** The message kind `cancel`. */
  readonly kind = 'cancel'

  /** A set of valid Message kinds that can come after a Cancel */
  readonly validNext = new Set<MessageKind>([])

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: CancelMetadata

  /** Cancel's data containing a reason why the exchange was canceled */
  readonly data: CancelData

  constructor(metadata: CancelMetadata, data: CancelData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a JSON message into an Cancel.
   * @param rawMessage - The Cancel to parse.
   * @throws Error if the Cancel could not be parsed or is not a valid Cancel.
   * @returns The parsed Cancel.
   */
  static async parse(rawMessage: MessageModel | string): Promise<Cancel> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const cancel = new Cancel(
      jsonMessage.metadata as CancelMetadata,
      jsonMessage.data as CancelData,
      jsonMessage.signature
    )

    await cancel.verify()
    return cancel
  }

  /**
   * Creates an Cancel with the given options.
   * @param opts - Options to create an Cancel.
   */
  static create(opts: CreateCancelOptions): Cancel {
    const metadata: CancelMetadata = {
      ...opts.metadata,
      kind      : 'cancel',
      id        : Message.generateId('cancel'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const cancel = new Cancel(metadata, opts.data)
    cancel.validateData()
    return cancel
  }
}