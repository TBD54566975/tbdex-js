import type { JwtPayload } from '@web5/crypto'
import type { ErrorDetail } from './types.js'
import type { DidDocument, BearerDid } from '@web5/dids'
import {
  Balance,
  Close,
  MessageModel,
  Order,
  Parser,
  Rfq,
} from '@tbdex/protocol'

import {
  RequestError,
  ResponseError,
  InvalidDidError,
  MissingServiceEndpointError,
  RequestTokenMissingClaimsError,
  RequestTokenAudienceMismatchError,
  RequestTokenSigningError,
  RequestTokenVerificationError,
  RequestTokenIssuerSignerMismatchError
} from './errors/index.js'
import { resolveDid, Offering, Message } from '@tbdex/protocol'
import { utils as didUtils } from '@web5/dids'
import { typeid } from 'typeid-js'
import { Jwt, JwtVerifyResult } from '@web5/credentials'

import queryString from 'query-string'
import ms from 'ms'

/**
 * Parameters for generating a request token
 * @beta
 */
export type GenerateRequestTokenParams = {
  requesterDid: BearerDid
  pfiDid: string
}

/**
 * Parameters for verifying a request token
 * @beta
 */
export type VerifyRequestTokenParams = {
  requestToken: string
  pfiDid: string
}

/**
 * Required jwt claims expected in a request token
 * @beta
 */
export const requestTokenRequiredClaims = ['aud', 'iss', 'exp', 'iat', 'jti']

/**
 * HTTP client for interacting with TBDex PFIs
 * @beta
 */
export class TbdexHttpClient {

  /**
   * Sends an RFQ and options to the PFI to initiate an exchange
   * @param rfq - The RFQ message that will be sent to the PFI
   * @param opts.replyTo A callback URL where the PFI will send subsequent messages
   * @throws if message verification fails
   * @throws if recipient DID resolution fails
   * @throws if recipient DID does not have a PFI service entry
   */
  static async createExchange(rfq: Rfq, opts?: { replyTo?: string }): Promise<void> {
    await rfq.verify()

    const { to: pfiDid } = rfq.metadata
    const requestBody = JSON.stringify({ rfq, replyTo: opts?.replyTo })

    await TbdexHttpClient.sendMessage(pfiDid, 'POST', `/exchanges`, requestBody)
  }

  /**
   * Sends the Order message to the PFI
   * @param - order The Order message that will be sent to the PFI
   * @throws if message verification fails
   * @throws if recipient DID resolution fails
   * @throws if recipient DID does not have a PFI service entry
   */
  static async submitOrder(order: Order): Promise<void> {
    await order.verify()

    const { to: pfiDid, exchangeId } = order.metadata
    const requestBody = JSON.stringify(order)

    await TbdexHttpClient.sendMessage(pfiDid, 'PUT', `/exchanges/${exchangeId}`, requestBody)
  }

  /**
   * Sends the Close message to the PFI
   * @param - close The Close message that will be sent to the PFI
   * @throws if message verification fails
   * @throws if recipient DID resolution fails
   * @throws if recipient DID does not have a PFI service entry
   */
  static async submitClose(close: Close): Promise<void> {
    await close.verify()

    const { to: pfiDid, exchangeId } = close.metadata

    const requestBody = JSON.stringify(close)

    await TbdexHttpClient.sendMessage(pfiDid, 'PUT', `/exchanges/${exchangeId}`, requestBody)
  }

  private static async sendMessage(pfiDid: string, verb: 'GET' | 'PUT' | 'POST', path: string, requestBody: string): Promise<void> {
    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}${path}`

    let response: Response
    try {
      response = await fetch(apiRoute, {
        method  : verb,
        headers : { 'content-type': 'application/json' },
        body    : requestBody
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
   * gets offerings from the pfi provided
   * @param opts - options
   * @beta
   */
  static async getOfferings(opts: GetOfferingsOptions): Promise<Offering[]> {
    const { pfiDid } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}/offerings`

    let response: Response
    try {
      response = await fetch(apiRoute)
    } catch (e) {
      throw new RequestError({ message: `Failed to get offerings from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
    }

    const offerings: Offering[] = []

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json()
    const jsonOfferings = responseBody.data as any[]
    for (let jsonOffering of jsonOfferings) {
      const offering = await Offering.parse(jsonOffering)
      offerings.push(offering)
    }

    return offerings
  }

  /**
   * gets balances from the pfi provided
   * @param opts - options
   * @beta
   */
  static async getBalances(opts: GetBalancesOptions): Promise<Balance[]> {
    const { pfiDid, did } = opts

    const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
    const apiRoute = `${pfiServiceEndpoint}/balances`
    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: did, pfiDid })

    let response: Response
    try {
      response = await fetch(apiRoute, {
        headers: {
          authorization: `Bearer ${requestToken}`
        }
      })
    } catch (e) {
      throw new RequestError({ message: `Failed to get balances from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
    }

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json() as { data: Balance[] }
    const data: Balance[] = responseBody.data

    return data
  }

  /**
   * get a specific exchange from the pfi provided
   * @param opts - options
   */
  static async getExchange(opts: GetExchangeOptions): Promise<Message[]> {
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

    const messages: Message[] = []

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json() as { data: MessageModel[] }
    for (let jsonMessage of responseBody.data) {
      const message = await Parser.parseMessage(jsonMessage)
      messages.push(message)
    }

    return messages

  }

  // TODO: Wrap Message[] in Exchange object and verify each message
  /**
   * returns all exchanges created by requester
   * @param opts - options
   */
  static async getExchanges(opts: GetExchangesOptions): Promise<Message[][]> {
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

    const exchanges: Message[][] = []

    if (!response.ok) {
      const errorDetails = await response.json() as ErrorDetail[]
      throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
    }

    const responseBody = await response.json() as { data: MessageModel[][] }
    for (let jsonExchange of responseBody.data) {
      const exchange: Message[] = []

      for (let jsonMessage of jsonExchange) {
        const message = await Parser.parseMessage(jsonMessage)
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
    let didDocument: DidDocument
    try {
      didDocument = await resolveDid(did)
    } catch (e) {
      throw new InvalidDidError(e.message)
    }

    const [didService] = didUtils.getServices({ didDocument, type: 'PFI' })

    if (!didService?.serviceEndpoint) {
      throw new MissingServiceEndpointError(`${did} has no PFI service entry`)
    }

    return didService.serviceEndpoint
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
  *  * `jti` The JWT is then signed and returned.
  *
  * @returns the request token (JWT)
  * @throws {@link RequestTokenSigningError} If an error occurs during the token generation.
  */
  static async generateRequestToken(params: GenerateRequestTokenParams): Promise<string> {
    const { pfiDid, requesterDid } = params
    const now = Date.now()
    const exp = (now + ms('1m'))

    const jwtPayload: JwtPayload = {
      aud : pfiDid,
      iss : requesterDid.uri,
      exp : Math.floor(exp / 1000),
      iat : Math.floor(now / 1000),
      jti : typeid().getSuffix()
    }

    try {
      return await Jwt.sign({ signerDid: requesterDid, payload: jwtPayload })
    } catch(e) {
      throw new RequestTokenSigningError({ message: e.message, cause: e })
    }
  }

  /**
   * Validates and verifies the integrity of a request token ([JWT](https://datatracker.ietf.org/doc/html/rfc7519))
   * generated by {@link TbdexHttpClient.generateRequestToken}. Specifically:
   *   * verifies integrity of the JWT
   *   * ensures all required claims are present and valid.
   *   * ensures the token has not expired
   *   * ensures token audience matches the expected PFI DID.
   *
   * @returns the requester's DID as a string if the token is valid.
   * @throws {@link RequestTokenVerificationError} If the token is invalid, expired, or has been tampered with
   * @throws {@link RequestTokenMissingClaimsError} If the token does not contain all required claims
   * @throws {@link RequestTokenAudienceMismatchError} If the token's `aud` property does not match the PFI's DID
  */
  static async verifyRequestToken(params: VerifyRequestTokenParams): Promise<string> {
    let result: JwtVerifyResult

    try {
      result = await Jwt.verify({ jwt: params.requestToken })
    } catch(e) {
      throw new RequestTokenVerificationError({ message: e.message, cause: e })
    }

    const { header: requestTokenHeader, payload: requestTokenPayload } = result

    // check to ensure all expected claims are present
    for (let claim of requestTokenRequiredClaims) {
      if (!requestTokenPayload[claim]) {
        throw new RequestTokenMissingClaimsError({ message: `Request token missing ${claim} claim. Expected ${requestTokenRequiredClaims}.` })
      }
    }

    // TODO: decide if we want to ensure that the expiration date is not longer than 1 minute after the issuance date

    if (requestTokenPayload.aud !== params.pfiDid) {
      throw new RequestTokenAudienceMismatchError({ message: 'Request token contains invalid audience. Expected aud property to be PFI DID.' })
    }

    const signerKid = requestTokenHeader.kid!
    const issuerDid = requestTokenPayload.iss!

    if (!signerKid.includes(issuerDid)) {
      throw new RequestTokenIssuerSignerMismatchError({ message: 'Request token issuer does not match signer' })
    }

    return issuerDid
  }
}

/**
 * options passed to {@link TbdexHttpClient.getOfferings} method
 * @beta
 */
export type GetOfferingsOptions = {
  /** the DID of the PFI from whom you want to get offerings */
  pfiDid: string
}

/**
 * options passed to {@link TbdexHttpClient.getBalances} method
 * @beta
 */
export type GetBalancesOptions = {
  /** the DID of the PFI from whom you want to get balances */
  pfiDid: string
  did: BearerDid
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
  did: BearerDid
}

/**
 * options passed to {@link TbdexHttpClient.getExchanges} method
 * @beta
 */
export type GetExchangesOptions = {
  /** the DID of the PFI from whom you want to get offerings */
  pfiDid: string
  /** the message author's DID */
  did: BearerDid,
  /** the filter to select the desired exchanges */
  filter?: {
    /** ID or IDs of exchanges to get */
    id: string | string[]
  }
}