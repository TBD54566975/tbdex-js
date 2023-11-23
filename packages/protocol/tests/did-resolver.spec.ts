import { expect } from 'chai'
import { resolveDid } from '../src/did-resolver.js'
import { DidDhtMethod } from '@web5/dids'

describe('Did Resolver', () => {
  describe('resolveDid', () => {
    it.only('resolves did:dht', async () => {
      const did = await DidDhtMethod.create()
      const resolutionResult = await resolveDid(did.did)

      console.log(JSON.stringify(resolutionResult, null, 2))
      expect(resolutionResult.id).to.equal(did.did)
    })
  })
})

