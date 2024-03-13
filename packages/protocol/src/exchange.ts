import { Close, Order, OrderStatus, Quote, Rfq } from './message-kinds/index.js'
import { Message } from './message.js'
import { MessageKind } from './types.js'

/**
 * State-machine for validating the order and metadata of Tbdex messages in an exchange.
 *
 * This state-machine does not validate the {@link Message.signature} or {@link Message.data}
 * of messages in the exchange.
 *
 * Either add messages in order one at a time using {@link Exchange.addNextMessage},
 * or add a list of unsorted messages in an exchange using {@link Exchange.addMessages}
 *
 * @beta
 */
export class Exchange {
  /** Message sent by Alice to PFI to request a quote */
  rfq: Rfq | undefined
  /** Message sent by the PFI in response to an RFQ */
  quote: Quote | undefined
  /** Message sent by Alice to the PFI to accept a quote*/
  order: Order | undefined
  /** Message sent by the PFI to Alice to convet the current status of the order */
  orderstatus: OrderStatus[]
  /** Message sent by either the PFI or Alice to terminate an exchange */
  close: Close | undefined

  constructor() {
    this.orderstatus = []
  }

  /**
   * Add a list of unsorted messages to an exchange.
   * @param messages - An unsorted array of Tbdex messages in a given exchange
   */
  addMessages(messages: Message[]): void {
    // Sort with earliest dateCreated first
    const sortedMessages = messages.sort((m1, m2) => {
      const time1 = new Date(m1.metadata.createdAt).getTime()
      const time2 = new Date(m2.metadata.createdAt).getTime()
      return time1 - time2
    })

    for (const message of sortedMessages) {
      this.addNextMessage(message)
    }
  }

  /**
   * Add the next message in the exchange
   * @param message - The next allowed message in the exchange
   * @throws if message's protocol version does not match protocol version of other messages in the exchange
   * @throws if message is not a valid next message. See {@link Exchange.isValidNext}
   * @throws if message's exchangeId does not match id of the exchange
   */
  addNextMessage(message: Message): void {
    if (this.protocol !== undefined && message.metadata.protocol !== this.protocol) {
      throw new Error(
        `Could not add message (${message.metadata.id}) with protocol version ${message.metadata.protocol} to exchange because it does not have matching ` +
        `protocol version ${this.protocol} as other messages in the exchange`
      )
    }

    if (!this.isValidNext(message.metadata.kind)) {
      throw new Error(
        `Could not add message (${message.metadata.id}) to exchange because ${message.metadata.kind} ` +
        `is not a valid next message`
      )
    }

    if (this.exchangeId !== undefined && message.metadata.exchangeId !== this.exchangeId) {
      throw new Error(
        `Could not add message (${message.metadata.id}) with exchange id ${message.metadata.exchangeId} to exchange because it does not have matching ` +
        `exchange id ${this.exchangeId} as the exchange`
      )
    }

    if (message.isRfq()) {
      this.rfq = message
    } else if (message.isQuote()) {
      this.quote = message
    } else if (message.isClose()) {
      this.close = message
    } else if (message.isOrder()) {
      this.order = message
    } else if (message.isOrderStatus()) {
      this.orderstatus.push(message)
    } else {
      // Unreachable
      throw new Error('Unrecognized message kind')
    }
  }

  /**
   * Determines if the message kind is a valid next message in the current exchange
   * @param messageKind - the kind of TBDex message
   * @returns true if the next message in the exchange may have kind messageKind, false otherwise
   */
  isValidNext(messageKind: MessageKind): boolean {
    const validNext = this.latestMessage?.validNext ?? new Set<MessageKind>(['rfq'])
    return validNext.has(messageKind)
  }

  /**
   * Latest message in an exchange if there are any messages currently
   */
  get latestMessage(): Message | undefined {
    return this.close ??
           this.orderstatus[this.orderstatus.length - 1] ??
           this.order ??
           this.quote ??
           this.rfq
  }

  /**
   * The exchangeId of all messages in the Exchange
   */
  get exchangeId(): string | undefined {
    return this.rfq?.metadata?.exchangeId
  }

  /**
   * The protocol version of all messages in the Exchange
   */
  get protocol(): string | undefined {
    return this.rfq?.metadata?.protocol
  }

  /**
   * A sorted list of messages currently in the exchange.
   */
  get messages(): Message[] {
    const allPossibleMessages: (Message | undefined)[] = [
      this.rfq,
      this.quote,
      this.order,
      ...this.orderstatus,
      this.close
    ]
    return allPossibleMessages.filter((message): message is Message => message !== undefined)
  }
}