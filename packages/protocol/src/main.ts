/**
 * Library that can be used to create, parse, verify, and validate
 * the tbDEX Messages and Resources defined in the
 * [protocol specification](https://github.com/TBD54566975/tbdex-protocol/blob/main/README.md).
 *
 * [Link to GitHub Repo](https://github.com/TBD54566975/tbdex-js/tree/main/packages/protocol)
 *
 * @packageDocumentation
 */

import { Resource } from './resource.js'
import { Message } from './message.js'

export * from './resource-kinds/index.js'
export * from './message-kinds/index.js'
export * from './exchange.js'
export * from './did-resolver.js'
export * from './dev-tools.js'
export * from './crypto.js'
export * from './parser.js'
export * from './types.js'
export { Message, Resource }
