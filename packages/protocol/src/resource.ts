import type { ResourceModel, ResourceMetadata, ResourceKind, ResourceData } from './types.js'
import type { Balance, Offering } from './resource-kinds/index.js'

import { typeid } from 'typeid-js'
import { Crypto } from './crypto.js'
import { validate } from './validator.js'
import { BearerDid } from '@web5/dids'

/**
 * tbDEX Resources are published by PFIs for anyone to consume and generally used as a part of the discovery process.
 * They are not part of the message exchange, i.e Alice cannot reply to a Resource.
 * @beta
 */
export abstract class Resource {
  /** The resource kind (e.g. offering) */
  abstract kind: ResourceKind
  /** Metadata such as creator, date created, date updated, and ID */
  protected metadata: ResourceMetadata
  /** Resource kind-specific data */
  protected data: ResourceData
  /** signature that verifies that authenticity and integrity of a message */
  private _signature: string | undefined

  /**
   * Constructor is primarily for intended for internal use. For a better developer experience,
   * consumers should use concrete classes to programmatically create and parse resources,
   * e.g. {@link Offering.parse} and {@link Offering.create}
   * @param metadata - {@link Resource.metadata}
   * @param data - {@link Resource.data}
   * @param signature - {@link Resource._signature}
   */
  protected constructor(metadata: ResourceMetadata, data: ResourceData, signature?: string) {
    this.metadata = metadata
    this.data = data
    this._signature = signature
  }

  /** Generates a unique id with the resource kind's prefix */
  static generateId(resourceKind: ResourceKind) {
    return typeid(resourceKind).toString()
  }

  /**
   * Signs the resource as a jws with detached content and sets the signature property
   * @param did - the signer's DID
   * @throws If the signature could not be produced
   */
  async sign(did: BearerDid): Promise<void> {
    this._signature = await Crypto.sign({ did, payload: this.digest(), detached: true })
  }


  /**
   * Validates the resource structure and verifies the cryptographic signature
   * @throws if the resource signature is invalid
   * @throws if the signer's DID does not match Resource.metadata.from
   * @throws if the resource structure is invalid
   * @throws see {@link Crypto.verify}
   * @returns Resource signer's DID
   */
  async verify(): Promise<string> {
    this.validate()

    const signer = this.verifySignature()

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
   * Valid structure of the resource including the presence of the signature
   * using the official spec JSON Schemas
   * @throws If the resource's structure does not match the JSON schemas
   */
  validate(): void {
    validate(this.toJSON(), 'resource')
    this.validateData()
  }

  /**
   * Validates `data` section of resource only using the official TBDex JSON Schemas.
   * This is useful for partially validating unsigned resources.
   * @throws If the structure of the Resource's data does not match the JSON schemas
   */
  validateData(): void {
    validate(this.data, this.kind)
  }

  /**
   * returns the resource as a json object. Automatically used by `JSON.stringify` method.
   */
  toJSON(): ResourceModel {
    return {
      metadata  : this.metadata,
      data      : this.data,
      signature : this.signature
    }
  }

  /** the resource's cryptographic signature */
  get signature() {
    return this._signature
  }

  /** the resource's id */
  get id() {
    return this.metadata.id
  }

  /** The sender's DID */
  get from() {
    return this.metadata.from
  }

  /** Resource creation time. Expressed as ISO8601 */
  get createdAt() {
    return this.metadata.createdAt
  }

  /** Resource last updated time. Expressed as ISO8601 */
  get updatedAt() {
    return this.metadata.updatedAt
  }

  /** the protocol version */
  get protocol() {
    return this.metadata.protocol
  }

  /** offering type guard */
  isOffering(): this is Offering {
    return this.metadata.kind === 'offering'
  }

  /** balance type guard */
  isBalance(): this is Balance {
    return this.metadata.kind === 'balance'
  }
}
