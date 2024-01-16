import type { MessageKind, MessageKindModel, MessageMetadata } from '../types.js'
import { Message } from '../message.js'

/**
 * Options passed to {@link OrderStatus.create}
 * @beta
 */
export type CreateCloseOptions = {
  data: MessageKindModel<'close'>
  metadata: Omit<MessageMetadata<'close'>, 'id' |'kind' | 'createdAt'>
}

/**
 * A Close can be sent by Alice or the PFI as a reply to an RFQ or a Quote
 * @beta
 */
export class Close extends Message<'close'> {
  /** a set of valid Message kinds that can come after a close */
  readonly validNext = new Set<MessageKind>([])

  /**
   * Creates a close message with the given options
   * @param opts - options to create a close message
   */
  static create(opts: CreateCloseOptions) {
    const metadata: MessageMetadata<'close'> = {
      ...opts.metadata,
      kind      : 'close' as const,
      id        : Message.generateId('close'),
      createdAt : new Date().toISOString()
    }

    const message = { metadata, data: opts.data }
    Message.validateData('close', message.data)
    return new Close(message)
  }

  /** an explanation of why the exchange is being closed */
  get reason() {
    return this.data.reason
  }
}