import { expect } from 'chai'

import { DevTools, Crypto } from '../src/main.js'
import { utils as didUtils } from '@web5/dids'
import { Convert } from '@web5/common'

describe('Crypto', () => {
  describe('sign / verify', () => {
    it('works with did:ion', async () => {
      const alice = await DevTools.createDid('ion')
      const [ verificationMethodKey ] = alice.keySet.verificationMethodKeys
      const { privateKeyJwk } = verificationMethodKey

      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({
        privateKeyJwk,
        kid      : `${alice.did}#${privateKeyJwk.kid}`,
        payload  : payloadBytes,
        detached : false
      })

      await Crypto.verify({ signature: token })
    })

    it('works with did:key', async () => {
      const alice = await DevTools.createDid('key')
      const [ verificationMethodKey ] = alice.keySet.verificationMethodKeys
      const { privateKeyJwk } = verificationMethodKey

      const parsedDid = didUtils.parseDid({ didUrl: alice.did })
      const kid = `${alice.did}#${parsedDid.id}`

      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({
        privateKeyJwk,
        kid,
        payload  : payloadBytes,
        detached : false
      })

      await Crypto.verify({ signature: token })
    })

    it('works with detached content', async () => {
      const alice = await DevTools.createDid('ion')
      const [ verificationMethodKey ] = alice.keySet.verificationMethodKeys
      const { privateKeyJwk } = verificationMethodKey

      const payload = { timestamp: new Date().toISOString() }
      const payloadBytes = Convert.object(payload).toUint8Array()

      const token = await Crypto.sign({
        privateKeyJwk,
        kid      : `${alice.did}#${privateKeyJwk.kid}`,
        payload  : payloadBytes,
        detached : true
      })

      const did = await Crypto.verify({ signature: token, detachedPayload: payloadBytes })
      expect(alice.did).to.equal(did)
    })
  })
})