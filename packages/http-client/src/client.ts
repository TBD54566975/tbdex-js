import type { ErrorDetail } from './types.js'
import type { PortableDid } from '@web5/dids'
import type {
  ResourceMetadata,
  MessageModel,
  OfferingData,
  ResourceModel,
  MessageKind,
  MessageKindClass,
} from '@tbdex/protocol'

import { resolveDid, Offering, Resource, Message, Crypto } from '@tbdex/protocol'
import { utils as didUtils } from '@web5/dids'
import { Convert } from '@web5/common'
import { RequestError, ResponseError, InvalidDidError, MissingServiceEndpointError } from './errors/index.js'
import queryString from 'query-string'

/**
 * HTTP client for interacting with TBDex PFIs
 * @beta
 */
export class TbdexHttpClient {
  /**
   * sends the message provided to the intended recipient
   * @param opts - options
   * @throws if message verification fails
   * @throws if recipient DID resolution fails
   * @throws if recipient DID does not have a PFI service entry
   */
  static async sendMessage<T extends MessageKind>(opts: SendMessageOptions<T>): Promise<void> {
    const { message, replyTo } = opts

    const jsonMessage: MessageModel<T> = message instanceof Message ? message.toJSON() : message

    await Message.verify(jsonMessage)

    const { to: pfiDid, exchangeId, kind } = jsonMessage.metadata
    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}/exchanges/${exchangeId}/${kind}`

    let response: Response
    try {
      let requestBody
      if (jsonMessage.metadata.kind == 'rfq') {
        requestBody = JSON.stringify({ rfq: jsonMessage, replyTo})
      } else {
        requestBody = JSON.stringify(jsonMessage)
      }
      response = await fetch(apiRoute, {
        method  : 'POST',
        headers : { 'content-type': 'application/json' },
        body    : requestBody
      })
    } catch(e) {
      throw new RequestError({ message: `Failed to send message to ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
    }

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }
  }

  /**
   * Discover PFIs that are anchored via did:ion. These have a type of "PFI" and an id of PFI.
   * You can then query the endpoints for offerings.
   */
  static async discoverPFIs() {
    const BASE_URL = 'https://ion.tbd.engineering'
    const DID_TYPE_ENDPOINT = '/didtype/1669'
    const IDENTIFIER_PREFIX = '/identifiers/'

    async function fetchDIDList() {
      const response = await fetch(BASE_URL + DID_TYPE_ENDPOINT)
      if (!response.ok) {
        throw new Error('Failed to fetch DID list')
      }
      return await response.json()
    }

    async function fetchDIDData(did) {
      console.log(BASE_URL + IDENTIFIER_PREFIX + did)
      const response = await fetch(BASE_URL + IDENTIFIER_PREFIX + did)
      if (!response.ok) {
        throw new Error('Failed to fetch DID data for ' + did)
      }
      return await response.json()
    }

    const ids = await fetchDIDList()
    const promises = ids.map(id => {
      const ionDid = 'did:ion:' + id
      return fetchDIDData(ionDid)
    })
    const didDataList = await Promise.all(promises)

    const pfiServiceEndpoints = didDataList.reduce((results, didData) => {
      const services = didData.didDocument.service
      const pfiServices = services.filter(service => service.type === 'PFI')

      if (pfiServices.length > 0) {
        results.push({
          did             : didData.didDocument.id,
          serviceEndpoint : pfiServices[0].serviceEndpoint
        })
      }

      return results
    }, [])

    return pfiServiceEndpoints
  }

  /**
   * gets offerings from the pfi provided
   * @param opts - options
   * @beta
   */
  static async getOfferings(opts: GetOfferingsOptions): Promise<Offering[]> {
    const { pfiDid , filter } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const queryParams = filter ? `?${queryString.stringify(filter)}`: ''
    const apiRoute = `${pfiServiceEndpoint}/offerings${queryParams}`

    let response: Response
    try {
      response = await fetch(apiRoute)
    } catch(e) {
      throw new RequestError({ message: `Failed to get offerings from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
    }

    const data: Offering[] = []

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json() as { data: ResourceModel<'offering'>[] }
    for (let jsonResource of responseBody.data) {
      const resource = await Resource.parse(jsonResource)
      data.push(resource)
    }

    return data
  }

  /**
   * get a specific exchange from the pfi provided
   * @param _opts - options
   */
  static async getExchange(opts: GetExchangeOptions): Promise<MessageKindClass[]> {
    const { pfiDid, exchangeId, did } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}/exchanges/${exchangeId}`
    const requestToken = await TbdexHttpClient.generateRequestToken(did)

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch(e) {
      throw new RequestError({ message: `Failed to get exchange from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
    }

    const data: MessageKindClass[] = []

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json() as { data: MessageModel<MessageKind>[] }
    for (let jsonMessage of responseBody.data) {
      const message = await Message.parse(jsonMessage)
      data.push(message)
    }

    return data

  }

  /**
   * returns all exchanges created by requester
   * @param _opts - options
   */
  static async getExchanges(opts: GetExchangesOptions): Promise<MessageKindClass[][]> {
    const { pfiDid, filter, did } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const queryParams = filter ? `?${queryString.stringify(filter)}`: ''
    const apiRoute = `${pfiServiceEndpoint}/exchanges${queryParams}`
    const requestToken = await TbdexHttpClient.generateRequestToken(did)

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch(e) {
      throw new RequestError({ message: `Failed to get exchanges from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
    }

    const exchanges: MessageKindClass[][] = []

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json() as { data: MessageModel<MessageKind>[][] }
    for (let jsonExchange of responseBody.data) {
      const exchange: MessageKindClass[] = []

      for (let jsonMessage of jsonExchange) {
        const message = await Message.parse(jsonMessage)
        exchange.push(message)
      }

      exchanges.push(exchange)
    }

    return exchanges
  }

  /**
   * returns the PFI service entry from the DID Doc of the DID provided
   * @param did - the pfi's DID
   */
  static async getPfiServiceEndpoint(did: string) {
    try {
      const didDocument = await resolveDid(did)
      const [ didService ] = didUtils.getServices({ didDocument, type: 'PFI' })

      if (!didService?.serviceEndpoint) {
        throw new MissingServiceEndpointError(`${did} has no PFI service entry`)
      }

      return didService.serviceEndpoint
    } catch (e) {
      if (e instanceof MissingServiceEndpointError) {
        throw e
      }
      throw new InvalidDidError(e)
    }
  }

  /**
   * generates a jws to be used to authenticate GET requests
   * @param did - the requester's did
   */
  static async generateRequestToken(did: PortableDid): Promise<string> {
    // TODO: include exp property. expires 1 minute from generation time
    // TODO: include aud property. should be DID of receipient
    // TODO: include nbf property. not before current time
    // TODO: include iss property. should be requester's did
    const payload = { timestamp: new Date().toISOString() }
    const payloadBytes = Convert.object(payload).toUint8Array()

    return Crypto.sign({ did: did, payload: payloadBytes, detached: false })
  }

  /**
   * validates the bearer token and verifies the cryptographic signature
   * @throws if the token is invalid
   * @throws see {@link @tbdex/protocol#Crypto.verify}
   */
  static async verify(requestToken: string): Promise<string> {
    return Crypto.verify({ signature: requestToken })
  }
}

/**
 * options passed to {@link TbdexHttpClient.sendMessage} method
 * @beta
 */
export type SendMessageOptions<T extends MessageKind> = {
  /** the message you want to send */
  message: Message<T> | MessageModel<T>
  /**
   * A string containing a valid URI where new messages from the PFI will be sent.
   * This field is only available as an option when sending an RFQ Message.
   */
  replyTo?: T extends 'rfq' ? string : never
}

/**
 * options passed to {@link TbdexHttpClient.getOfferings} method
 * @beta
 */
export type GetOfferingsOptions = {
  /** the DID of the PFI from whom you want to get offerings */
  pfiDid: string
  filter?: {
    /** ISO 3166 currency code string */
    payinCurrency?: OfferingData['payinCurrency']['currencyCode']
    /** ISO 3166 currency code string */
    payoutCurrency?: OfferingData['payoutCurrency']['currencyCode']
    id?: ResourceMetadata<any>['id']
  }
}

/**
 * options passed to {@link TbdexHttpClient.getExchange} method
 * @beta
 */
export type GetExchangeOptions = {
  /** the DID of the PFI from whom you want to get offerings */
  pfiDid: string
  /** the exchange you want to fetch */
  exchangeId: string

  /** the message author's DID */
  did: PortableDid
}

/**
 * options passed to {@link TbdexHttpClient.getExchanges} method
 * @beta
 */
export type GetExchangesOptions = {
  /** the DID of the PFI from whom you want to get offerings */
  pfiDid: string
  did: PortableDid,
  filter?: {
    id: string | string[]
  }
}