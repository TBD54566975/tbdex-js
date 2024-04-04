import type { MessageKind, MessageModel, MessageMetadata, MessageData } from './types.js'
import { Rfq, Quote, Order, OrderStatus, Close } from './message-kinds/index.js'

import { Crypto } from './crypto.js'
import { typeid } from 'typeid-js'
import { BearerDid } from '@web5/dids'
import { validate } from './validator.js'

/**
 * Representation of the protocol messages.
 * It also provides helper functions to manipulate raw messages, JSON and parsing.
 * @beta
 */
export abstract class Message {
  /** A set of valid Message kinds that can come after this message in an exchange */
  abstract validNext: Set<MessageKind>

  /** The message kind (e.g. rfq, quote) */
  abstract kind: MessageKind

  /** Metadata such as sender, recipient, date created, and ID */
  readonly metadata: MessageMetadata
  /** Message kind-specific data to facilitate the exchange of assets between Alice and the PFI */
  readonly data: MessageData
  /** signature that verifies that authenticity and integrity of a message */
  protected _signature: string | undefined

  /**
   * Constructor is primarily for intended for internal use. For a better developer experience,
   * consumers should use concrete classes to programmatically create and parse messages,
   * e.g. {@link Rfq.parse} and {@link Rfq.create}
   * @param metadata - {@link Message.metadata}
   * @param data - {@link Message.data}
   * @param signature - {@link Message._signature}
   */
  protected constructor(metadata: MessageMetadata, data: MessageData, signature?: string) {
    this.metadata = metadata
    this.data = data
    this._signature = signature
  }

  /** Generates a unique id with the message kind's prefix */
  static generateId(messageKind: MessageKind): string {
    return typeid(messageKind).toString()
  }

  /**
   * Signs the message as a jws with detached content and sets the signature property
   * @param did - the signer's DID
   * @throws If the signature could not be produced
   */
  async sign(did: BearerDid): Promise<void> {
    this._signature = await Crypto.sign({ did, payload: this.digest(), detached: true })
  }

  /**
   * Validates the message structure and verifies the cryptographic signature
   * @throws if the message signature is invalid
   * @throws if the message structure is invalid
   * @throws see {@link Crypto.verify}
   * @returns Signer's DID
   */
  async verify(): Promise<string> {
    this.validate()

    const signer = await this.verifySignature()

    return signer
  }

  /**
   * Verifies the integrity of the cryptographic signature
   * @throws if the resource signature is invalid
   * @throws if the signer's DID does not match Resource.metadata.from
   * @returns Resource signer's DID
   */
  async verifySignature(): Promise<string> {
    if (this.signature === undefined) {
      throw new Error('Could not verify message signature because no signature is missing')
    }

    const signer = await Crypto.verify({ detachedPayload: this.digest(), signature: this.signature })

    if (this.metadata.from !== signer) { // ensure that DID used to sign matches `from` property in metadata
      throw new Error('Signature verification failed: Expected DID in kid of JWS header must match metadata.from')
    }

    return signer
  }

  /**
   * Computes a digest of the payload by:
   * * JSON serializing the payload as per [RFC-8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
   * * sha256 hashing the serialized payload
   *
   * @returns The SHA-256 hash of the canonicalized payload, represented as a byte array.
   */
  digest(): Uint8Array {
    return Crypto.digest({ metadata: this.metadata, data: this.data })
  }

  /**
   * Valid structure of the message including the presence of the signature
   * using the official spec JSON Schemas
   * @throws If the message's structure does not match the JSON schemas
   */
  validate(): void {
    validate(this.toJSON(), 'message')
    this.validateData()
  }

  /**
   * Validates `data` section of message only using the official TBDex JSON Schemas.
   * This is useful for partially validating unsigned messages.
   * @throws If the structure of the messages's data does not match the JSON schemas
   */
  validateData(): void {
    validate(this.data, this.kind)
  }

  /** the message's cryptographic signature */
  get signature() {
    return this._signature
  }

  /** the message id */
  get id() {
    return this.metadata.id
  }

  /** ID for an "exchange" of messages between Alice - PFI. Uses the id of the RFQ that initiated the exchange */
  get exchangeId() {
    return this.metadata.exchangeId
  }

  /** The sender's DID */
  get from() {
    return this.metadata.from
  }

  /** the recipient's DID */
  get to() {
    return this.metadata.to
  }

  /** Message creation time. Expressed as ISO8601 */
  get createdAt() {
    return this.metadata.createdAt
  }

  /** the external ID */
  get externalId() {
    return this.metadata.externalId
  }

  /** the protocol version */
  get protocol() {
    return this.metadata.protocol
  }

  /** Rfq type guard */
  isRfq(): this is Rfq {
    return this.metadata.kind === 'rfq'
  }

  /** Quote type guard */
  isQuote(): this is Quote {
    return this.metadata.kind === 'quote'
  }

  /** Order type guard */
  isOrder(): this is Order {
    return this.metadata.kind === 'order'
  }

  /** OrderStatus type guard */
  isOrderStatus(): this is OrderStatus {
    return this.metadata.kind === 'orderstatus'
  }

  /** Close type guard */
  isClose(): this is Close {
    return this.metadata.kind === 'close'
  }

  /**
   * returns the message as a json object. Automatically used by `JSON.stringify` method.
   */
  toJSON() {
    const message: MessageModel = {
      metadata  : this.metadata,
      data      : this.data,
      signature : this.signature
    }

    return message
  }
}