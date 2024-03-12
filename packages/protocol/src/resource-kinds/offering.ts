import type { OfferingData, OfferingMetadata, ResourceModel } from '../types.js'
import { Resource } from '../resource.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link Offering.create}
 * @beta
 */
export type CreateOfferingOptions = {
  data: OfferingData
  metadata: Omit<OfferingMetadata, 'id' |'kind' | 'createdAt' | 'updatedAt' | 'protocol'> & { protocol?: OfferingMetadata['protocol'] }
}

/**
 * An Offering is used by the PFI to describe a currency pair they have to offer
 * including the requirements, conditions, and constraints in
 * order to fulfill that offer.
 * @beta
 */
export class Offering extends Resource {
  /** The resource kind (offering) */
  readonly kind = 'offering'
  /** Metadata such as sender, date created, date updated, and ID */
  readonly metadata: OfferingMetadata
  /** Offering's data such as payment methods, required claims, and currencies */
  readonly data: OfferingData

  constructor(metadata: OfferingMetadata, data: OfferingData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json resource into an Offering
   * @param rawMessage - the Offering to parse
   * @throws if the offering could not be parsed or is not a valid Offering
   * @returns The parsed Offering
   */
  static async parse(rawMessage: ResourceModel | string): Promise<Offering> {
    const jsonMessage = Parser.rawToResourceModel(rawMessage)

    const offering = new Offering(
      jsonMessage.metadata as OfferingMetadata,
      jsonMessage.data as OfferingData,
      jsonMessage.signature
    )

    await offering.verify()
    return offering
  }

  /**
   * Creates an Offering with the given options
   * @param opts - options to create an offering
   */
  static create(opts: CreateOfferingOptions) {
    const metadata: OfferingMetadata = {
      ...opts.metadata,
      kind      : 'offering',
      id        : Resource.generateId('offering'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const offering = new Offering(metadata, opts.data)
    offering.validateData()
    return offering
  }
}