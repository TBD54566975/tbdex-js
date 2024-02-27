import { expect } from 'chai'

import { Convert } from '@web5/common'
import { Crypto } from '../src/main.js'
import { DidJwk } from '@web5/dids'

describe('Crypto', () => {
  describe('sign / verify', () => {
    it('works with detached content', async () => {
      const alice = await DidJwk.create()
      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({ did: alice, payload: payloadBytes, detached: true })

      const did = await Crypto.verify({ signature: token, detachedPayload: payloadBytes })
      expect(alice.uri).to.equal(did)
    }).timeout(30_000)
  })
})