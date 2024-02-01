import type { MessageModel, ResourceModel, RfqMetadata, RfqData, QuoteData, QuoteMetadata, OrderData, OrderMetadata, OrderStatusMetadata, OrderStatusData, CloseMetadata, CloseData, OfferingMetadata, OfferingData } from './types.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Resource } from './resource.js'
import type { Message } from './message.js'

import { Rfq, Quote, Order, OrderStatus, Close } from './message-kinds/index.js'
import { Offering } from './resource-kinds/index.js'

/**
 * Parses the json message into a message instance.
 * Performs format validation and an integrity check on the signature
 * Note: This really should be a part of {@link parseMessage} but can't be because it creates a circular dependency
 * due to each concrete MessageKind class extending Message
 * @param message - the message to parse. can either be an object or a string
 * @returns {@link Message}
 */
export async function parseMessage(rawMessage: MessageModel | string): Promise<Message> {
  const jsonMessage = rawToMessageModel(rawMessage)

  let message: Message
  switch(jsonMessage.metadata.kind) {
    case 'rfq':
      message = new Rfq(
        jsonMessage.metadata as RfqMetadata,
        jsonMessage.data as RfqData,
        jsonMessage.signature
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
 * Parses a json message into an instance of message kind's class.
 * Performs format validation and an integrity check of the signature
 * Note: This really should be a part of {@link Resource.parse} but can't be because it creates a circular dependency
 * due to each concrete MessageKind class extending Message
 * @param jsonResource - the resource to parse
 * @returns {@link Resource}
 */
export async function parseResource(rawResource: ResourceModel | string): Promise<Resource> {
  const jsonResource = rawToResourceModel(rawResource)

  let resource: Resource
  switch(jsonResource.metadata.kind) {
    case 'offering':
      resource = new Offering(
        jsonResource.metadata as OfferingMetadata,
        jsonResource.data as OfferingData,
        jsonResource.signature
      )
      break

    default:
      throw new Error(`Unrecognized resource kind (${jsonResource.metadata.kind})`)
  }

  await resource.verify()

  return resource
}

export function rawToMessageModel(rawMessage: MessageModel | string): MessageModel {
  try {
    return typeof rawMessage === 'string' ? JSON.parse(rawMessage): rawMessage
  } catch(e) {
    const errorMessage = e instanceof Error ? e.message : e
    throw new Error(`parse: Failed to parse message. Error: ${errorMessage}`)
  }
}

export function rawToResourceModel(rawMessage: ResourceModel | string): ResourceModel {
  try {
    return typeof rawMessage === 'string' ? JSON.parse(rawMessage): rawMessage
  } catch(e) {
    const errorMessage = e instanceof Error ? e.message : e
    throw new Error(`parse: Failed to parse resource. Error: ${errorMessage}`)
  }
}