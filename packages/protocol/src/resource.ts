import type { ResourceModel, ResourceMetadata, ResourceKind, ResourceKindModel, NewResource } from './types.js'
import type { ResourceKindClass } from './resource-kinds/index.js'

import { typeid } from 'typeid-js'
import { Crypto } from './crypto.js'
import { validate } from './validator.js'
import { PortableDid } from '@web5/dids'


/**
 * tbDEX Resources are published by PFIs for anyone to consume and generally used as a part of the discovery process.
 * They are not part of the message exchange, i.e Alice cannot reply to a Resource.
 * @beta
 */
export abstract class Resource<T extends ResourceKind> {
  private _metadata: ResourceMetadata<T>
  private _data: ResourceKindModel<T>
  private _signature: string

  /**
   * used by {@link Resource.parse} to return an instance of resource kind's class. This abstraction is needed
   * because importing the Resource Kind classes (e.g. Offering) creates a circular dependency
   * due to each concrete Resource Kind class extending Resource. Library consumers dont have to worry about setting this
  */
  static factory: <T extends ResourceKind>(jsonResource: ResourceModel<T>) => ResourceKindClass

  /**
   * Constructor is primarily for intended for internal use. For a better developer experience,
   * consumers should use concrete classes to programmatically create resources (e.g. Offering class) and
   * {@link Resource.parse} to parse stringified resources.
   * @param jsonResource - the resource as a json object
   * @param data - `resource.data` as a ResourceKind class instance. can be passed in as an optimization if class instance
   * is present in calling scope
   */
  constructor(jsonResource: NewResource<T>) {
    this._metadata = jsonResource.metadata
    this._data = jsonResource.data
    this._signature = jsonResource.signature
  }

  /**
   * parses the json resource into a Resource instance. performs format validation and an integrity check on the signature
   * @param payload - the resource to parse. can either be an object or a string
   */
  static async parse<T extends ResourceKind>(resource: ResourceModel<T> | string): Promise<ResourceKindClass> {
    let jsonResource: ResourceModel<T>
    try {
      jsonResource = typeof resource === 'string' ? JSON.parse(resource): resource
    } catch(e) {
      throw new Error(`parse: Failed to parse resource. Error: ${e.message}`)
    }

    await Resource.verify(jsonResource)

    return Resource.factory(jsonResource)
  }

  /**
   * validates the resource and verifies the cryptographic signature
   * @throws if the message is invalid
   * @throws see {@link Crypto.verify}
   */
  static async verify<T extends ResourceKind>(resource: ResourceModel<T> | Resource<T>): Promise<string> {
    let jsonResource: ResourceModel<T> = resource instanceof Resource ? resource.toJSON() : resource
    Resource.validate(jsonResource)

    const digest = Crypto.digest({ metadata: jsonResource.metadata, data: jsonResource.data })
    const signerDid = await Crypto.verify({ detachedPayload: digest, signature: jsonResource.signature })

    if (jsonResource.metadata.from !== signerDid) { // ensure that DID used to sign matches `from` property in metadata
      throw new Error('Signature verification failed: Expected DID in kid of JWS header must match metadata.from')
    }

    return signerDid
  }

  /**
   * validates the resource provided against the appropriate json schemas.
   * 2-phased validation: First validates the resource structure and then
   * validates `data` based on the value of `metadata.kind`
   * @param jsonResource - the resource to validate
   *
   * @throws `Error` if validation fails
   */
  static validate(jsonResource: any): void {
    validate(jsonResource, 'resource')
    validate(jsonResource['data'], jsonResource['metadata']['kind'])
  }

  /** Generates a unique id with the resource kind's prefix */
  static generateId(resourceKind: ResourceKind) {
    return typeid(resourceKind).toString()
  }

  /**
   * signs the message as a jws with detached content and sets the signature property
   * @param did - the signer's DID
   */
  async sign(did: PortableDid): Promise<void> {
    const payload = { metadata: this.metadata, data: this.data }
    const payloadDigest = Crypto.digest(payload)

    this._signature = await Crypto.sign({ did, payload: payloadDigest, detached: true })
  }

  /**
   * validates the resource and verifies the cryptographic signature
   * @throws if the resource is invalid
   * @throws see {@link Crypto.verify}
   */
  async verify() {
    return Resource.verify(this)
  }

  /**
   * returns the message as a json object. Automatically used by `JSON.stringify` method.
   */
  toJSON(): ResourceModel<T> {
    return {
      metadata  : this.metadata,
      data      : this.data,
      signature : this.signature
    }
  }

  /** The metadata object contains fields about the resource and is present in every tbdex resource. */
  get metadata() {
    return this._metadata
  }

  /** the actual resource kind's content data */
  get data() {
    return this._data
  }

  /** the resource's cryptographic signature */
  get signature() {
    return this._signature
  }

  /** the resource's id */
  get id() {
    return this.metadata.id
  }

  /** the resource kind (e.g. offering) */
  get kind() {
    return this.metadata.kind
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

  /** offering type guard */
  isOffering(): this is Resource<'offering'> {
    return this.metadata.kind === 'offering'
  }
}