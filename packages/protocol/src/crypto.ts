import type {
  JwsHeaderParams,
  JwkParamsEcPublic,
  JwkParamsOkpPublic,
} from '@web5/crypto'

import { sha256 } from '@noble/hashes/sha256'
import { Convert } from '@web5/common'
import { LocalKeyManager } from '@web5/crypto'
import { DidResolver, isVerificationMethod } from './did-resolver.js'

import canonicalize from 'canonicalize'
import { BearerDid, DidVerificationMethod } from '@web5/dids'

const keyManager = new LocalKeyManager()

/**
 * Options passed to {@link Crypto.sign}
 * @beta
 */
export type SignOptions = {
  /** Indicates whether the payload is detached from the JWS. If `true`, the payload is not included in the resulting JWS. */
  detached: boolean,
  /** The payload to be signed. */
  payload: Uint8Array,
  /** the DID to sign with */
  did: BearerDid,
}

/**
 * Options passed to {@link Crypto.verify}
 * @beta
 */
export type VerifyOptions = {
  /** The payload that was signed. required only if the signature is a detached JWS */
  detachedPayload?: Uint8Array,
  signature: string
}

/**
 * Cryptographic utility functions, such as hashing, signing, and verifying
 * @beta
 */
export class Crypto {
  /**
   * Computes a digest of the payload by:
   * * JSON serializing the payload as per [RFC-8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
   * * sha256 hashing the serialized payload
   *
   * @returns The SHA-256 hash of the canonicalized payload, represented as a byte array.
   */
  static digest(payload: any) {
    // @ts-ignore
    const canonicalized = canonicalize(payload)
    const canonicalizedBytes = Convert.string(canonicalized).toUint8Array()

    return sha256(canonicalizedBytes)
  }

  /**
   * Signs the provided payload and produces a compact JSON Web Signature (JWS).
   *
   * @param opts - The options required for signing.
   * @returns A promise that resolves to the generated compact JWS.
   * @throws Will throw an error if the specified algorithm is not supported.
   */
  static async sign(opts: SignOptions) {
    const { did, payload, detached } = opts

    const signer = await did.getSigner()

    let verificationMethodId = signer.keyId
    if (verificationMethodId.startsWith('#')) {
      verificationMethodId = `${did.uri}${verificationMethodId}`
    }

    const jwsHeader: JwsHeaderParams = { alg: signer.algorithm, kid: verificationMethodId }
    const base64UrlEncodedJwsHeader = Convert.object(jwsHeader).toBase64Url()
    const base64urlEncodedJwsPayload = Convert.uint8Array(payload).toBase64Url()

    const toSign = `${base64UrlEncodedJwsHeader}.${base64urlEncodedJwsPayload}`
    const toSignBytes = Convert.string(toSign).toUint8Array()

    const signatureBytes = await signer.sign({ data: toSignBytes })
    const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url()

    if (detached) {
      // compact JWS with detached content: https://datatracker.ietf.org/doc/html/rfc7515#appendix-F
      return `${base64UrlEncodedJwsHeader}..${base64UrlEncodedSignature}`
    } else {
      return `${base64UrlEncodedJwsHeader}.${base64urlEncodedJwsPayload}.${base64UrlEncodedSignature}`
    }
  }

  /**
   * Verifies the integrity of a message or resource's signature.
   *
   * @param opts - The options required for verification.
   * @returns A promise that resolves to the DID of the signer if verification is successful.
   * @throws Various errors related to invalid input or failed verification.
   */
  static async verify(opts: VerifyOptions): Promise<string> {
    const { signature, detachedPayload } = opts

    if (!signature) {
      throw new Error('Signature verification failed: Expected signature property to exist')
    }

    const splitJws = signature.split('.')
    if (splitJws.length !== 3) {
      throw new Error('Signature verification failed: Expected valid JWS with detached content')
    }

    let [base64UrlEncodedJwsHeader, base64urlEncodedJwsPayload, base64UrlEncodedSignature] = splitJws

    if (detachedPayload) {
      if (base64urlEncodedJwsPayload.length !== 0) { // ensure that JWS payload is empty
        throw new Error('Signature verification failed: Expected valid JWS with detached content')
      }
      base64urlEncodedJwsPayload = Convert.uint8Array(detachedPayload).toBase64Url()
    }

    const jwsHeader = Convert.base64Url(base64UrlEncodedJwsHeader).toObject() as JwsHeaderParams
    if (!jwsHeader.alg || !jwsHeader.kid) { // ensure that JWS header has required properties
      throw new Error('Signature verification failed: Expected JWS header to contain alg and kid')
    }

    const dereferenceResult = await DidResolver.dereference(jwsHeader.kid)

    const verificationMethod = dereferenceResult.contentStream as DidVerificationMethod
    if (!isVerificationMethod(verificationMethod)) { // ensure that appropriate verification method was found
      throw new Error('Signature verification failed: Expected kid in JWS header to dereference to a DID Document Verification Method')
    }

    // will be used to verify signature
    const publicKeyJwk = verificationMethod.publicKeyJwk as JwkParamsEcPublic | JwkParamsOkpPublic

    if (!publicKeyJwk) { // ensure that Verification Method includes public key as a JWK.
      throw new Error('Signature verification failed: Expected kid in JWS header to dereference to a DID Document Verification Method with publicKeyJwk')
    }

    const signedData = `${base64UrlEncodedJwsHeader}.${base64urlEncodedJwsPayload}`
    const signedDataBytes = Convert.string(signedData).toUint8Array()

    const signatureBytes = Convert.base64Url(base64UrlEncodedSignature).toUint8Array()

    const isLegit = await keyManager.verify({ key: publicKeyJwk, data: signedDataBytes, signature: signatureBytes })

    if (!isLegit) {
      throw new Error('Signature verification failed: Integrity mismatch')
    }

    const [did] = jwsHeader.kid.split('#')
    return did
  }
}
