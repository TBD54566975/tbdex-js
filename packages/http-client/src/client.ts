import type { JwtPayload } from '@web5/crypto'
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

import {
  RequestError,
  ResponseError,
  InvalidDidError,
  MissingServiceEndpointError,
  RequestTokenMissingClaimsError,
  RequestTokenAudienceMismatchError,
  RequestTokenExpiredError,
  RequestTokenSigningError,
  RequestTokenVerificationError
} from './errors/index.js'
import { resolveDid, Offering, Resource, Message } from '@tbdex/protocol'
import { utils as didUtils } from '@web5/dids'
import { typeid } from 'typeid-js'
import { Jwt } from '@web5/credentials'

import queryString from 'query-string'
import ms from 'ms'

export type GenerateRequestTokenParams = {
  requesterDid: PortableDid
  pfiDid: string
}

export type VerifyRequestTokenParams = {
  requestToken: string
  pfiDid: string
}

// required jwt claims expected in request token
export const requestTokenRequiredClaims = ['aud', 'iss', 'exp', 'iat', 'jti']

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
    } catch (e) {
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
    const { pfiDid, filter } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const queryParams = filter ? `?${queryString.stringify(filter)}` : ''
    const apiRoute = `${pfiServiceEndpoint}/offerings${queryParams}`

    let response: Response
    try {
      response = await fetch(apiRoute)
    } catch (e) {
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
    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: did, pfiDid })

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch (e) {
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
    const queryParams = filter ? `?${queryString.stringify(filter)}` : ''
    const apiRoute = `${pfiServiceEndpoint}/exchanges${queryParams}`
    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: did, pfiDid })

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch (e) {
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
      const [didService] = didUtils.getServices({ didDocument, type: 'PFI' })

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
  * Creates and signs a request token ([JWT](https://datatracker.ietf.org/doc/html/rfc7519))
  * that's included as the value of Authorization header for requests sent to a PFI API's
  * endpoints that require authentication
  *
  * JWT payload with the following claims:
  *  * `aud`
  *  * `iss`
  *  * `exp`
  *  * `iat`
  *  * `jti`The JWT is then signed and returned.
  *
  * @returns the request token (JWT)
  * @throws {RequestTokenError} If an error occurs during the token generation.
  */
  static async generateRequestToken(params: GenerateRequestTokenParams): Promise<string> {
    const now = Date.now()
    const exp = (now + ms('1m'))

    const jwtPayload: JwtPayload = {
      aud : params.pfiDid,
      iss : params.requesterDid.did,
      exp : Math.floor(exp / 1000),
      iat : Math.floor(now / 1000),
      jti : typeid().getSuffix()
    }

    try {
      return await Jwt.sign({ signerDid: params.requesterDid, payload: jwtPayload })
    } catch(e) {
      throw new RequestTokenSigningError({ message: e.message, cause: e })
    }
  }

  /**
   * Validates and verifies the integrity of a request token ([JWT](https://datatracker.ietf.org/doc/html/rfc7519))
   * generated by {@link generateRequestToken}. Specifically:
   *   * verifies integrity of the JWT
   *   * ensures all required claims are present and valid.
   *   * ensures the token has not expired
   *   * ensures token audience matches the expected PFI DID.
   *
   * @returns the requester's DID as a string if the token is valid.
   * @throws {RequestTokenError} If the token is invalid, expired, or has been tampered with
  */
  static async verifyRequestToken(params: VerifyRequestTokenParams): Promise<string> {
    let result

    try {
      result = await Jwt.verify({ jwt: params.requestToken })
    } catch(e) {
      throw new RequestTokenVerificationError({ message: e.message, cause: e })
    }

    const { payload: requestTokenPayload } = result

    // check to ensure all expected claims are present
    for (let claim of requestTokenRequiredClaims) {
      if (!requestTokenPayload[claim]) {
        throw new RequestTokenMissingClaimsError({ message: `Request token missing ${claim} claim. Expected ${requestTokenRequiredClaims}.` })
      }
    }

    // check to ensure request token has not expired
    // TODO: remove once PR is pulled into Web5 Credentials pkg: https://github.com/TBD54566975/web5-js/pull/366
    if (Math.floor(Date.now() / 1000) > requestTokenPayload.exp) {
      throw new RequestTokenExpiredError({ message: 'Request token is expired.' })
    }

    // TODO: decide if we want to ensure that the expiration date is not longer than 1 minute after the issuance date

    if (requestTokenPayload.aud !== params.pfiDid) {
      throw new RequestTokenAudienceMismatchError({ message: 'Request token contains invalid audience. Expected aud property to be PFI DID.' })
    }

    return requestTokenPayload.iss
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