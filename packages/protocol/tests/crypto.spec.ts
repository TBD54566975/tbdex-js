import { expect } from 'chai'

import { DidIonMethod, DidKeyMethod } from '@web5/dids'
import { Convert } from '@web5/common'
import { Crypto } from '../src/main.js'

describe('Crypto', () => {
  describe('sign / verify', () => {
    it('works with did:ion', async () => {
      const alice = await DidIonMethod.create()
      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({ did: alice, payload: payloadBytes, detached: false })
      await Crypto.verify({ signature: token })
    }).timeout(30_000)

    it('works with did:key', async () => {
      const alice = await DidKeyMethod.create()

      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({ did: alice, payload: payloadBytes, detached: false })
      await Crypto.verify({ signature: token })
    })

    it('works with detached content', async () => {
      const alice = await DidIonMethod.create()
      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({ did: alice, payload: payloadBytes, detached: true })

      const did = await Crypto.verify({ signature: token, detachedPayload: payloadBytes })
      expect(alice.did).to.equal(did)
    }).timeout(30_000)
  })
})