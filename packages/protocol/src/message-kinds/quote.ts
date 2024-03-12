import type { MessageKind, MessageModel, QuoteData, QuoteMetadata } from '../types.js'
import { Message } from '../message.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link Quote.create}
 * @beta
 */
export type CreateQuoteOptions = {
  data: QuoteData
  metadata: Omit<QuoteMetadata, 'id' |'kind' | 'createdAt' | 'protocol'> & { protocol?: QuoteMetadata['protocol'] }
}

/**
 * Sent by the PFI in response to an RFQ. Includes a locked-in price that the PFI is willing to honor until
 * the quote expires
 * @beta
 */
export class Quote extends Message {
  /** a set of valid Message kinds that can come after a quote */
  readonly validNext = new Set<MessageKind>(['order', 'close'])
  /** The message kind (quote) */
  readonly kind = 'quote'

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: QuoteMetadata
  /**
   * Quote's data containing locked-in price and payment methods that the PFI is willing to honor
   * until the quote expires
   */
  readonly data: QuoteData

  constructor(metadata: QuoteMetadata, data: QuoteData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json message into a Quote
   * @param rawMessage - the quote to parse
   * @throws if the quote could not be parsed or is not a valid Quote
   * @returns The parsed Quote
   */
  static async parse(rawMessage: MessageModel | string): Promise<Quote> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    const quote = new Quote(
      jsonMessage.metadata as QuoteMetadata,
      jsonMessage.data as QuoteData,
      jsonMessage.signature
    )

    await quote.verify()
    return quote
  }

  /**
   * Creates a quote message with the given options
   * @param opts - options to create a quote
   */
  static create(opts: CreateQuoteOptions): Quote {
    const metadata: QuoteMetadata = {
      ...opts.metadata,
      kind      : 'quote',
      id        : Message.generateId('quote'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const quote = new Quote(metadata, opts.data)
    quote.validateData()
    return quote
  }
}