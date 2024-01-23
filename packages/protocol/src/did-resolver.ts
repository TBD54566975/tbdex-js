import type { DidDocument, DidService, VerificationMethod } from '@web5/dids'

import { DidResolver as Web5DidResolver, DidKeyMethod, DidIonMethod, DidDhtMethod } from '@web5/dids'

/**
 * Can be used to resolve did:ion and did:key DIDs
 *
 * @beta
 */
export const DidResolver = new Web5DidResolver({
  didResolvers: [DidIonMethod, DidKeyMethod, DidDhtMethod]
})

/**
 * Resolves the DID provided
 * @param did - the DID to resolve
 * @returns {@link @web5/dids#DidDocument}
 * @beta
 */
export async function resolveDid(did: string): Promise<DidDocument> {
  const { didResolutionMetadata, didDocument } = await DidResolver.resolve(did)

  // TODO: remove the '?' after we ask OSE peeps about why DID ION resolution doesn't return didResolutionMetadata
  // despite being required as per the did-core spec
  if (didResolutionMetadata?.error) {
    throw new Error(`Failed to resolve DID: ${did}. Error: ${didResolutionMetadata.error}`)
  }

  // If did resolution has no errors, assume we have did document
  return didDocument!
}

/**
 * A DID Resource is either a DID Document, a DID Verification method or a DID Service
 * @beta
 */
export type DidResource = DidDocument | VerificationMethod | DidService

/**
 * type guard for {@link @web5/dids#VerificationMethod}
 * @param didResource - the resource to check
 * @returns true if the didResource is a `VerificationMethod`
 * @beta
 */
export function isVerificationMethod(didResource: DidResource | null): didResource is VerificationMethod {
  return !!didResource && 'id' in didResource && 'type' in didResource && 'controller' in didResource
}