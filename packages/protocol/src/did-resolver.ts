import type { DidDocument, DidService, VerificationMethod } from '@web5/dids'

import { DidResolver as Web5DidResolver, DidKeyMethod, DidIonMethod, DidDhtMethod, utils as didUtils } from '@web5/dids'

/**
 * Can be used to resolve did:ion and did:key DIDs
 *
 * @beta
 */
const DidResolver = new Web5DidResolver({
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

  return didDocument
}

/**
 * A DID Resource is either a DID Document, a DID Verification method or a DID Service
 * @beta
 */
export type DidResource = DidDocument | VerificationMethod | DidService

/**
 * Dereferences a DID URL according to [specification](https://www.w3.org/TR/did-core/#did-url-dereferencing).
 * See also: [DID URL Syntax](https://www.w3.org/TR/did-core/#did-url-syntax)
 *
 * **Note**: Support is limited to did#fragment within [Verification Method](https://www.w3.org/TR/did-core/#verification-methods)
 * and [Service](https://www.w3.org/TR/did-core/#services) only
 * @param didUrl - the did url to dereference
 * @returns the dereferenced resource
 * @throws if DID URL cannot be parsed
 * @throws if DID cannot be resolved
 * @beta
 */
export async function deferenceDidUrl(didUrl: string): Promise<DidResource> {
  const parsedDid = didUtils.parseDid({ didUrl })
  if (!parsedDid) {
    throw new Error('failed to parse did')
  }

  const didDocument = await resolveDid(didUrl)

  // return the entire DID Document if no fragment is present on the did url
  if (!parsedDid.fragment) {
    return didDocument
  }

  const { service, verificationMethod } = didDocument

  // create a set of possible id matches. the DID spec allows for an id to be the entire did#fragment or just #fragment.
  // See: https://www.w3.org/TR/did-core/#relative-did-urls
  // using a set for fast string comparison. DIDs can be lonnng.
  const idSet = new Set([didUrl, parsedDid.fragment, `#${parsedDid.fragment}`])

  for (let vm of verificationMethod) {
    if (idSet.has(vm.id)) {
      return vm
    }
  }

  for (let svc of service) {
    if (idSet.has(svc.id)) {
      return svc
    }
  }
}

/**
 * type guard for {@link @web5/dids#VerificationMethod}
 * @param didResource - the resource to check
 * @returns true if the didResource is a `VerificationMethod`
 * @beta
 */
export function isVerificationMethod(didResource: DidResource): didResource is VerificationMethod {
  return didResource && 'id' in didResource && 'type' in didResource && 'controller' in didResource
}