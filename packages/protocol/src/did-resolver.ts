import type { DidDocument, DidResource, DidVerificationMethod } from '@web5/dids'

import { UniversalResolver, DidDht, DidJwk, DidWeb } from '@web5/dids'

/**
 * Can be used to resolve and dereference did:dht, did:jwk, and did:web DIDs
 *
 * @beta
 */
export const DidResolver = new UniversalResolver({
  didResolvers: [DidDht, DidJwk, DidWeb]
})

/**
 * Resolves the DID provided
 * @param did - the DID to resolve
 * @returns {@link @web5/dids#DidDocument}
 * @beta
 */
export async function resolveDid(did: string): Promise<DidDocument> {
  const { didResolutionMetadata, didDocument } = await DidResolver.resolve(did)

  if (didResolutionMetadata.error) {
    throw new Error(`Failed to resolve DID: ${did}. Error: ${didResolutionMetadata.error}`)
  }

  // If did resolution has no errors, assume we have did document
  return didDocument!
}

/**
 * type guard for {@link @web5/dids#VerificationMethod}
 * @param didResource - the resource to check
 * @returns true if the didResource is a `VerificationMethod`
 * @beta
 */
export function isVerificationMethod(didResource: DidResource | null): didResource is DidVerificationMethod {
  return !!didResource && 'id' in didResource && 'type' in didResource && 'controller' in didResource
}