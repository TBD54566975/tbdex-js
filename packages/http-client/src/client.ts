import type { DataResponse, ErrorDetail, ErrorResponse, HttpResponse } from './types.js'
import type { PrivateKeyJwk as Web5PrivateKeyJwk } from '@web5/crypto'
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
  static async sendMessage<T extends MessageKind>(opts: SendMessageOptions<T>): Promise<HttpResponse | ErrorResponse> {
    const { message } = opts
    const jsonMessage: MessageModel<T> = message instanceof Message ? message.toJSON() : message

    await Message.verify(jsonMessage)

    const { to: pfiDid, exchangeId, kind } = jsonMessage.metadata
    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}/exchanges/${exchangeId}/${kind}`

    let response: Response
    try {
      response = await fetch(apiRoute, {
        method  : 'POST',
        headers : { 'content-type': 'application/json' },
        body    : JSON.stringify(jsonMessage)
      })
    } catch(e) {
      throw new Error(`Failed to send message to ${pfiDid}. Error: ${e.message}`)
    }

    const { status, headers } = response
    if (status === 202) {
      return { status, headers }
    } else {
      // TODO: figure out what happens if this fails. do we need to try/catch?
      const responseBody: { errors: ErrorDetail[] } = await response.json()
      return {
        status  : response.status,
        headers : response.headers,
        errors  : responseBody.errors
      }
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
   * @param _opts - options
   */
  static async getOfferings(opts: GetOfferingsOptions): Promise<DataResponse<Offering[]> | ErrorResponse> {
    const { pfiDid , filter } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const queryParams = filter ? `?${queryString.stringify(filter)}`: ''
    const apiRoute = `${pfiServiceEndpoint}/offerings${queryParams}`

    let response: Response
    try {
      response = await fetch(apiRoute)
    } catch(e) {
      throw new Error(`Failed to get offerings from ${pfiDid}. Error: ${e.message}`)
    }

    const data: Offering[] = []

    if (response.status === 200) {
      const responseBody = await response.json() as { data: ResourceModel<'offering'>[] }
      for (let jsonResource of responseBody.data) {
        const resource = await Resource.parse(jsonResource)
        data.push(resource)
      }

      return {
        status  : response.status,
        headers : response.headers,
        data    : data
      }
    } else {
      return {
        status  : response.status,
        headers : response.headers,
        errors  : await response.json() as ErrorDetail[]
      } as ErrorResponse
    }
  }

  /**
   * get a specific exchange from the pfi provided
   * @param _opts - options
   */
  static async getExchange(opts: GetExchangeOptions): Promise<DataResponse<MessageKindClass[]> | ErrorResponse> {
    const { pfiDid, exchangeId, privateKeyJwk } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}/exchanges/${exchangeId}`
    const requestToken = await TbdexHttpClient.generateRequestToken(privateKeyJwk, privateKeyJwk.kid)

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch(e) {
      throw new Error(`Failed to get offerings from ${pfiDid}. Error: ${e.message}`)
    }

    const data: MessageKindClass[] = []

    if (response.status === 200) {
      const responseBody = await response.json() as { data: MessageModel<MessageKind>[] }
      for (let jsonMessage of responseBody.data) {
        const message = await Message.parse(jsonMessage)
        data.push(message)
      }

      return {
        status  : response.status,
        headers : response.headers,
        data    : data
      }
    } else {
      return {
        status  : response.status,
        headers : response.headers,
        errors  : await response.json() as ErrorDetail[]
      } as ErrorResponse
    }
  }

  /**
   * returns all exchanges created by requester
   * @param _opts - options
   */
  static async getExchanges(opts: GetExchangesOptions): Promise<DataResponse<MessageKindClass[][]> | ErrorResponse> {
    const { pfiDid, filter, privateKeyJwk, kid } = opts
    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)

    const queryParams = filter ? `?${queryString.stringify(filter)}`: ''
    const apiRoute = `${pfiServiceEndpoint}/exchanges${queryParams}`
    const requestToken = await TbdexHttpClient.generateRequestToken(privateKeyJwk, kid)

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch(e) {
      throw new Error(`Failed to get exchanges from ${pfiDid}. Error: ${e.message}`)
    }

    const exchanges: MessageKindClass[][] = []

    if (response.status === 200) {
      const responseBody = await response.json() as { data: MessageModel<MessageKind>[][] }
      for (let jsonExchange of responseBody.data) {
        const exchange: MessageKindClass[] = []

        for (let jsonMessage of jsonExchange) {
          const message = await Message.parse(jsonMessage)
          exchange.push(message)
        }

        exchanges.push(exchange)
      }

      return {
        status  : response.status,
        headers : response.headers,
        data    : exchanges
      }
    } else {
      return {
        status  : response.status,
        headers : response.headers,
        errors  : await response.json() as ErrorDetail[]
      } as ErrorResponse
    }
  }

  /**
   * returns the PFI service entry from the DID Doc of the DID provided
   * @param did - the pfi's DID
   */
  static async getPfiServiceEndpoint(did: string) {
    const didDocument = await resolveDid(did)
    const [ didService ] = didUtils.getServices({ didDocument, type: 'PFI' })

    if (didService?.serviceEndpoint) {
      return didService.serviceEndpoint
    } else {
      throw new Error(`${did} has no PFI service entry`)
    }
  }

  /**
   * generates a jws to be used to authenticate GET requests
   * @param privateKeyJwk - the key to sign with
   * @param kid - the kid to include in the jws header. used by the verifier to select the appropriate verificationMethod
   *              when dereferencing the signer's DID
   */
  static async generateRequestToken(privateKeyJwk: Web5PrivateKeyJwk, kid: string): Promise<string> {
    // TODO: include exp property. expires 1 minute from generation time
    // TODO: include aud property. should be DID of receipient
    // TODO: include nbf property. not before current time
    // TODO: include iss property. should be requester's did
    const payload = { timestamp: new Date().toISOString() }
    const payloadBytes = Convert.object(payload).toUint8Array()

    return Crypto.sign({ privateKeyJwk, kid, payload: payloadBytes, detached: false })
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
  /** the private key used to sign the bearer token */
  privateKeyJwk: Web5PrivateKeyJwk
  kid: string
}

/**
 * options passed to {@link TbdexHttpClient.getExchanges} method
 * @beta
 */
export type GetExchangesOptions = {
  /** the DID of the PFI from whom you want to get offerings */
  pfiDid: string
  privateKeyJwk: Web5PrivateKeyJwk
  kid: string
  filter?: {
    id: string | string[]
  }
}