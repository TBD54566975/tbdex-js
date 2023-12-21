import { MessageKindClass } from './message-kinds/index.js'
import { Message } from './message.js'
import { ResourceKindClass } from './resource-kinds/index.js'
import { Resource } from './resource.js'
import { MessageKind, MessageKindName, MessageModel, ResourceKind, ResourceKindName, ResourceModel } from './types.js'

type ThingyModel<T extends MessageKind | ResourceKind> =
  T extends MessageKind ? MessageModel<T> :
  T extends ResourceKind ? ResourceModel<T> :
  never

export abstract class Thingy {
  static async parse<T extends MessageKind>(thingy: ThingyModel<T> | string): Promise<MessageKindClass | ResourceKindClass> {
    let jsonMessage: ThingyModel<T>
    try {
      jsonMessage = typeof thingy === 'string' ? JSON.parse(thingy): thingy
    } catch(e) {
      throw new Error(`parse: Failed to parse message. Error: ${e.message}`)
    }

    const kind = jsonMessage.metadata.kind as MessageKindName | ResourceKindName

    let klass
    if (Object.values(MessageKindName).includes(kind as MessageKindName)) {
      klass = Message
    } else if (Object.values(ResourceKindName).includes(kind as ResourceKindName)) {
      klass = Resource
    } else {
      throw new Error(`Invalid kind: ${kind}`)
    }

    await klass.verify(jsonMessage)
    return klass.factory(jsonMessage)
  }
}