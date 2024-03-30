import type { BalanceData, BalanceMetadata, ResourceModel } from '../types.js'
import { Resource } from '../resource.js'
import { Parser } from '../parser.js'

/**
 * Options passed to {@link Balance.create}
 * @beta
 */
export type CreateBalanceOptions = {
  data: BalanceData
  metadata: Omit<BalanceMetadata, 'id' |'kind' | 'createdAt' | 'updatedAt' | 'protocol'> & { protocol?: BalanceMetadata['protocol'] }
}

/**
 * A Balance is a protected resource used to communicate the amounts of each
 * currency held by the PFI on behalf of its customer.
 * @beta
 */
export class Balance extends Resource {
  /** The resource kind (balance) */
  readonly kind = 'balance'
  /** Metadata such as sender, date created, date updated, and ID */
  readonly metadata: BalanceMetadata
  /** Balance's data such as currencies and available amounts */
  readonly data: BalanceData

  constructor(metadata: BalanceMetadata, data: BalanceData, signature?: string) {
    super(metadata, data, signature)
    this.metadata = metadata
    this.data = data
  }

  /**
   * Parses a json resource into an Balance
   * @param rawMessage - the Balance to parse
   * @throws if the balance could not be parsed or is not a valid Balance
   * @returns The parsed Balance
   */
  static async parse(rawMessage: ResourceModel | string): Promise<Balance> {
    const jsonMessage = Parser.rawToResourceModel(rawMessage)

    const balance = new Balance(
      jsonMessage.metadata as BalanceMetadata,
      jsonMessage.data as BalanceData,
      jsonMessage.signature
    )

    await balance.verify()
    return balance
  }

  /**
   * Creates an Balance with the given options
   * @param opts - options to create an balance
   */
  static create(opts: CreateBalanceOptions) {
    const metadata: BalanceMetadata = {
      ...opts.metadata,
      kind      : 'balance',
      id        : Resource.generateId('balance'),
      createdAt : new Date().toISOString(),
      protocol  : opts.metadata.protocol ?? '1.0'
    }

    const balance = new Balance(metadata, opts.data)
    balance.validateData()
    return balance
  }
}