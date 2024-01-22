import type { MessageKind, MessageKindModel, MessageMetadata } from '../types.js'
import { Message } from '../message.js'

/**
 * Options passed to {@link Quote.create}
 * @beta
 */
export type CreateQuoteOptions = {
  data: MessageKindModel<'quote'>
  metadata: Omit<MessageMetadata<'quote'>, 'id' |'kind' | 'createdAt'>
}

/**
 * Sent by the PFI in response to an RFQ. Includes a locked-in price that the PFI is willing to honor until
 * the quote expires
 * @beta
 */
export class Quote extends Message<'quote'> {
  /** a set of valid Message kinds that can come after a quote */
  readonly validNext = new Set<MessageKind>(['order', 'close'])

  /**
   * Creates a quote message with the given options
   * @param opts - options to create a quote
   */
  static create(opts: CreateQuoteOptions) {
    const metadata: MessageMetadata<'quote'> = {
      ...opts.metadata,
      kind      : 'quote' as const,
      id        : Message.generateId('quote'),
      createdAt : new Date().toISOString()
    }
    const message = { metadata, data: opts.data }
    Message.validateData('quote', message.data)
    return new Quote(message)
  }

  /** When this quote expires. Expressed as ISO8601 */
  get expiresAt() {
    return this.data.expiresAt
  }

  /** the amount of payin currency that the PFI will receive */
  get payin() {
    return this.data.payin
  }

  /** the amount of payout currency that Alice will receive */
  get payout() {
    return this.data.payout
  }
}