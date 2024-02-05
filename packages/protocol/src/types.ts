import type { Schema as JsonSchema } from 'ajv'
import type { PresentationDefinitionV2 } from '@web5/credentials'

export { JsonSchema }

/**
 * Type alias to represent a brand new message (signature is optional)
 * @beta
 */
export type NewMessage<T extends MessageKind> = Omit<MessageModel<T>, 'signature'> & { signature?: string }

/**
 * Type alias to represent a brand new resource (signature is optional)
 * @beta
 */
export type NewResource<T extends ResourceKind> = Omit<ResourceModel<T>, 'signature'> & { signature?: string }

/**
 * Represents the full resource object: metadata + resource kind data + signature
 * @beta
 */
export type ResourceModel<T extends ResourceKind> = {
  /** The metadata object contains fields about the resource and is present in every tbdex resources of all types. */
  metadata: ResourceMetadata<T>
  /** The actual resource content */
  data: ResourceKindModel<T>
  /** signature that verifies that authenticity and integrity of a message */
  signature?: string
}

/**
 * Resource's metadata
 * @beta
 */
export type ResourceMetadata<T extends ResourceKind> = {
  /** The author's DID */
  from: string
  /** the resource kind (e.g. Offering) */
  kind: T
  /** the resource id */
  id: string
  /** When the resource was created at. Expressed as ISO8601 */
  createdAt: string
  /** When the resource was last updated. Expressed as ISO8601 */
  updatedAt?: string
}

/**
 * Type alias to represent a set of resource kind string keys
 * @beta
 */
export type ResourceKind = keyof ResourceKinds

/**
 * Type alias to represent the data content of a resource kind
 * @beta
 */
export type ResourceKindModel<T extends ResourceKind> = ResourceKinds[T]

/**
 * Type alias to map a resource kind to its key string value
 * @beta
 */
export type ResourceKinds = {
  'offering': OfferingData
}

/**
 * An Offering is used by the PFI to describe a currency pair they have to offer
 * including the requirements, conditions, and constraints in
 * order to fulfill that offer.
 * @beta
 */
export type OfferingData = {
  /** Brief description of what is being offered. */
  description: string
  /** Number of _payout_ currency units for one _payin_ currency unit (i.e 290000 USD for 1 BTC) */
  payoutUnitsPerPayinUnit: string
  /** Details about the currency that the PFI is selling. */
  payoutCurrency: CurrencyDetails
  /** Details about the currency that the PFI is buying in exchange for payout currency. */
  payinCurrency: CurrencyDetails
  /** A list of accepted payment methods that Alice can use to a _pay_ a PFI */
  payinMethods: PaymentMethod[]
  /** A list of accepted payment methods that Alice can use to receive the _payout_ currency from a PFI */
  payoutMethods: PaymentMethod[]
  /** Articulates the claim(s) required when submitting an RFQ for this offering. */
  requiredClaims?: PresentationDefinitionV2
}

/**
 * Currency details object
 * @beta
 */
export type CurrencyDetails = {
  /** ISO 3166 currency code string */
  currencyCode: string
  /** Minimum amount of currency that can be requested */
  minAmount?: string
  /** Maximum amount of currency that can be requested */
  maxAmount?: string
}

/**
 * The payment method specified by the resource pay in and pay out
 * @beta
 */
export type PaymentMethod = {
  /** The type of payment method. e.g. BITCOIN_ADDRESS, DEBIT_CARD etc */
  kind: string
  /** A JSON Schema containing the fields that need to be collected in order to use this payment method */
  requiredPaymentDetails: JsonSchema
}

/**
 * Represents the full message object: metadata + message kind data + signature
 * @beta
 */
export type MessageModel<T extends MessageKind> = {
  /** The metadata object contains fields about the message and is present in every tbdex message. */
  metadata: MessageMetadata<T>
  /** The actual message content */
  data: MessageKindModel<T>
  /** Private data that must not be in the main  */
  private?: T extends 'rfq' ? Record<string, any> : never
  /** signature that verifies that authenticity and integrity of a message */
  signature?: string
}

/**
 * Message's metadata
 * @beta
 */
export type MessageMetadata<T extends MessageKind> = {
  /** The sender's DID */
  from: string
  /** the recipient's DID */
  to: string
  /** the message kind (e.g. rfq, quote) */
  kind: T
  /** the message id */
  id: string
  /** ID for an "exchange" of messages between Alice - PFI. Uses the id of the RFQ that initiated the exchange */
  exchangeId: string
  /** Message creation time. Expressed as ISO8601 */
  createdAt: string
}

/**
 * Holds private data: PII, PCI, etc.
 * @beta
 */
export type Private = Record<string, any>

/**
 * Type alias to represent the data content of a message kind
 * @beta
 */
export type MessageKindModel<T extends keyof MessageKinds> = MessageKinds[T]

/**
 * Type alias to represent a set of message kind string keys
 * @beta
 */
export type MessageKind = 'rfq' | 'quote' | 'order' | 'orderstatus' | 'close'

/**
 * Type alias to map a message kind to its key string value
 * @beta
 */
export type MessageKinds = {
  'rfq': RfqData
  'quote': QuoteData
  'order': OrderData
  'orderstatus': OrderStatusData
  'close': CloseData
}

/**
 * Data contained in a RFQ message
 * @beta
 */
export type RfqData = {
  /** Offering which Alice would like to get a quote for */
  offeringId: string
  /** Amount of _payin_ currency alice wants to spend in order to receive payout currency */
  payinAmount: string
  /** Selected payment method that Alice will use to send the listed payin currency to the PFI. */
  payinMethod: SelectedPaymentMethod
  /** Selected payment method that the PFI will use to send the listed base currency to Alice */
  payoutMethod: SelectedPaymentMethod
  /** claims that fulfill the requirements declared in an Offering */
  claims: string[]
}

/**
 * The payment methods selected by Alice in the RFQ
 * @beta
 */
export type SelectedPaymentMethod = {
  /** Type of payment method e.g. BTC_ADDRESS, DEBIT_CARD, MOMO_MPESA */
  kind: string
  /** An object containing the properties defined in the respective Offering's requiredPaymentDetails json schema */
  paymentDetails: Record<string, any> | string
}

/**
 * Message sent by the PFI in response to an RFQ. Includes a locked-in price that the PFI is willing to honor until
 * the quote expires
 * @beta
 */
export type QuoteData = {
  /** When this quote expires. Expressed as ISO8601 */
  expiresAt: string
  /** the amount of payin currency that the PFI will receive */
  payin: QuoteDetails
  /** the amount of payout currency that Alice will receive */
  payout: QuoteDetails
}

/**
 * A QuoteDetails object describes the amount of a currency that is being sent or received
 * @beta
 */
export type QuoteDetails = {
  /** ISO 3166 currency code string */
  currencyCode: string
  /** The amount of currency */
  amount: string
  /** The amount paid in fees */
  fee?: string
  /** Object that describes how to pay the PFI, and how to get paid by the PFI (e.g. BTC address, payment link) */
  paymentInstruction?: PaymentInstruction
}

/**
 * Describes the payment instructions with plain text and/or a link
 * @beta
 */
export type PaymentInstruction = {
  /** Link to allow Alice to pay PFI, or be paid by the PFI */
  link?: string
  /** Instruction on how Alice can pay PFI, or how Alice can be paid by the PFI */
  instruction?: string
}

/**
 * Message sent by Alice to the PFI to accept a Quote. Order is currently an empty object
 * @beta
 */
export type OrderData = {
  [key: string]: never
}

/**
 * Message sent by the PFI to Alice to convey the current status of an order. There can be many OrderStatus
 * messages in a given Exchange
 * @beta
 */
export type OrderStatusData = {
  /** Current status of Order that's being executed (e.g. PROCESSING, COMPLETED, FAILED etc.) */
  orderStatus: string
}

/**
 * A Close can be sent by Alice or the PFI as a reply to an RFQ or a Quote
 * @beta
 */
export type CloseData = {
  /** an explanation of why the exchange is being closed */
  reason?: string
}

