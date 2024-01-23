import type {
  CryptoAlgorithm,
  Web5Crypto,
  JwsHeaderParams,
  JwkParamsEcPrivate,
  JwkParamsOkpPrivate,
  JwkParamsEcPublic,
  JwkParamsOkpPublic,
  PrivateKeyJwk,
  PublicKeyJwk
} from '@web5/crypto'

import { sha256 } from '@noble/hashes/sha256'
import { Convert } from '@web5/common'
import { EcdsaAlgorithm, EdDsaAlgorithm } from '@web5/crypto'
import { isVerificationMethod } from './did-resolver.js'

import canonicalize from 'canonicalize'
import { DidDhtMethod, DidIonMethod, DidKeyMethod, DidResolver, PortableDid, VerificationMethod } from '@web5/dids'

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
  did: PortableDid,
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
 * Used as value for each supported named curved listed in {@link Crypto.algorithms}
 * @beta
 */
type SignerValue<T extends Web5Crypto.Algorithm> = {
  signer: CryptoAlgorithm,
  options: T,
  alg: JwsHeader['alg'],
  crv: JsonWebKey['crv']
}

const secp256k1Signer: SignerValue<Web5Crypto.EcdsaOptions> = {
  signer  : new EcdsaAlgorithm(),
  options : { name: 'ECDSA' },
  alg     : 'ES256K',
  crv     : 'secp256k1'
}

const ed25519Signer: SignerValue<Web5Crypto.EdDsaOptions> = {
  signer  : new EdDsaAlgorithm(),
  options : { name: 'EdDSA' },
  alg     : 'EdDSA',
  crv     : 'Ed25519'
}

/**
 * Cryptographic utility functions, such as hashing, signing, and verifying
 * @beta
 */
export class Crypto {
  /** supported cryptographic algorithms. keys are `${alg}:${crv}`. */
  static algorithms: { [alg: string]: SignerValue<Web5Crypto.EcdsaOptions | Web5Crypto.EdDsaOptions> } = {
    'ES256K:'          : secp256k1Signer,
    'ES256K:secp256k1' : secp256k1Signer,
    ':secp256k1'       : secp256k1Signer,
    'EdDSA:Ed25519'    : ed25519Signer
  }

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

    const privateKeyJwk = did.keySet.verificationMethodKeys?.[0]?.privateKeyJwk as JwkParamsEcPrivate | JwkParamsOkpPrivate

    const algorithmName = privateKeyJwk?.['alg'] || ''
    let namedCurve = Crypto.extractNamedCurve(privateKeyJwk)
    const algorithmId = `${algorithmName}:${namedCurve}`

    const algorithm = this.algorithms[algorithmId]
    if (!algorithm) {
      throw new Error(`Algorithm (${algorithmId}) not supported`)
    }

    let verificationMethodId = did.document.verificationMethod?.[0]?.id || ''
    if (verificationMethodId.startsWith('#')) {
      verificationMethodId = `${did.did}${verificationMethodId}`
    }

    const jwsHeader: JwsHeader = { alg: algorithm.alg, kid: verificationMethodId }
    const base64UrlEncodedJwsHeader = Convert.object(jwsHeader).toBase64Url()
    const base64urlEncodedJwsPayload = Convert.uint8Array(payload).toBase64Url()

    const toSign = `${base64UrlEncodedJwsHeader}.${base64urlEncodedJwsPayload}`
    const toSignBytes = Convert.string(toSign).toUint8Array()

    const signatureBytes = await algorithm.signer.sign({ key: privateKeyJwk, data: toSignBytes, algorithm: algorithm.options })
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

    const didResolver = new DidResolver({ didResolvers: [DidKeyMethod, DidIonMethod, DidDhtMethod] })
    const dereferenceResult = await didResolver.dereference({ didUrl: jwsHeader.kid })

    const verificationMethod = dereferenceResult.contentStream as VerificationMethod
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

    const algorithmId = `${jwsHeader['alg']}:${Crypto.extractNamedCurve(publicKeyJwk)}`
    const { signer, options } = Crypto.algorithms[algorithmId]

    const isLegit = await signer.verify({ algorithm: options, key: publicKeyJwk, data: signedDataBytes, signature: signatureBytes })

    if (!isLegit) {
      throw new Error('Signature verification failed: Integrity mismatch')
    }

    const [did] = jwsHeader.kid.split('#')
    return did
  }

  /**
   * Gets crv property from a PublicKeyJwk or PrivateKeyJwk. Returns empty string if crv is undefined.
   */
  static extractNamedCurve(jwk: PrivateKeyJwk | PublicKeyJwk | undefined): string {
    if (jwk && 'crv' in jwk) {
      return jwk.crv
    } else {
      return ''
    }
  }
}

/**
 * monkey patch of JwsHeaderParams to include `EdDSA` as a valid alg
 * **NOTE**: Remove this once upstream `@web5/crypto` package is fixed
 * @internal
 */
type JwsHeader = Omit<JwsHeaderParams, 'alg'> & { alg: JwsHeaderParams['alg'] | 'EdDSA' }