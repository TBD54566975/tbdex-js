import type { MessageModel, ResourceModel, RfqMetadata, RfqData, QuoteData, QuoteMetadata, OrderData, OrderMetadata, OrderStatusMetadata, OrderStatusData, CloseMetadata, CloseData, OfferingMetadata, OfferingData, BalanceMetadata, BalanceData } from './types.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Resource } from './resource.js'
import type { Message } from './message.js'

import { Rfq, Quote, Order, OrderStatus, Close } from './message-kinds/index.js'
import { Balance, Offering } from './resource-kinds/index.js'

/**
 * Utility functions for parsing Messages and Resources
 * @beta
 */
export class Parser {
  private constructor() {}


  /**
   * @beta
   *
   * Parses the json message into a message instance.
   * Performs format validation and an integrity check on the signature
   * @param message - the message to parse. can either be an object or a string
   * @returns {@link Message}
   */
  static async parseMessage(rawMessage: MessageModel | string): Promise<Message> {
    const jsonMessage = Parser.rawToMessageModel(rawMessage)

    let message: Message
    switch(jsonMessage.metadata.kind) {
      case 'rfq':
        message = new Rfq(
          jsonMessage.metadata as RfqMetadata,
          jsonMessage.data as RfqData,
          jsonMessage.signature,
          jsonMessage.privateData,
        )
        break

      case 'quote':
        message = new Quote(
          jsonMessage.metadata as QuoteMetadata,
          jsonMessage.data as QuoteData,
          jsonMessage.signature
        )
        break

      case 'order':
        message = new Order(
          jsonMessage.metadata as OrderMetadata,
          jsonMessage.data as OrderData,
          jsonMessage.signature
        )
        break

      case 'orderstatus':
        message = new OrderStatus(
          jsonMessage.metadata as OrderStatusMetadata,
          jsonMessage.data as OrderStatusData,
          jsonMessage.signature
        )
        break

      case 'close':
        message = new Close(
          jsonMessage.metadata as CloseMetadata,
          jsonMessage.data as CloseData,
          jsonMessage.signature
        )
        break

      default:
        throw new Error(`Unrecognized message kind (${jsonMessage.metadata.kind})`)
    }

    await message.verify()

    return message
  }

  /**
   * @beta
   *
   * Parses a json message into an instance of message kind's class.
   * Performs format validation and an integrity check of the signature
   * @param jsonResource - the resource to parse
   * @returns {@link Resource}
   */
  static async parseResource(rawResource: ResourceModel | string): Promise<Resource> {
    const jsonResource = Parser.rawToResourceModel(rawResource)

    let resource: Resource
    switch(jsonResource.metadata.kind) {
      case 'offering':
        resource = new Offering(
          jsonResource.metadata as OfferingMetadata,
          jsonResource.data as OfferingData,
          jsonResource.signature
        )
        break
      case 'balance':
        resource = new Balance(
          jsonResource.metadata as BalanceMetadata,
          jsonResource.data as BalanceData,
          jsonResource.signature
        )
        break

      default:
        throw new Error(`Unrecognized resource kind (${jsonResource.metadata.kind})`)
    }

    await resource.verify()

    return resource
  }

  /**
   * Util for JSON.parse-ing a stringified Tbdex Message
   * @param rawMessage - Either a stringified Tbdex Message or an object Tbdex Message
   * @returns A Tbdex Message as an object
   * @throws If the stringified message could not be JSON.parse'd
   */
  static rawToMessageModel(rawMessage: MessageModel | string): MessageModel {
    try {
      return typeof rawMessage === 'string' ? JSON.parse(rawMessage): rawMessage
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : e
      throw new Error(`parse: Failed to parse message. Error: ${errorMessage}`)
    }
  }

  /**
   * Util for JSON.parse-ing a stringified Tbdex resource
   * @param rawResource - Either a stringified Tbdex resource or an object Tbdex resource
   * @returns A Tbdex message as an object
   * @throws If the stringified resource could not be JSON.parse'd
   */
  static rawToResourceModel(rawResource: ResourceModel | string): ResourceModel {
    try {
      return typeof rawResource === 'string' ? JSON.parse(rawResource): rawResource
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : e
      throw new Error(`parse: Failed to parse resource. Error: ${errorMessage}`)
    }
  }
}
