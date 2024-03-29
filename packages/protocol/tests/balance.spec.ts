import { Balance, Parser } from '../src/main.js'
import { DevTools } from '../src/dev-tools.js'
import { Convert } from '@web5/common'
import { expect } from 'chai'
import { DidDht } from '@web5/dids'

describe('Balance', () => {
  describe('create', () => {
    it('creates a Balance', async () => {
      const data = DevTools.createBalanceData()

      const balance = Balance.create({
        metadata: { from: 'did:ex:pfi' },
        data,
      })

      expect(balance.isBalance()).to.be.true
      expect(balance.metadata.kind).to.eq('balance')
      expect(balance.id).to.exist
      expect(balance.id).to.include('balance_')
      expect(balance.metadata.createdAt).to.exist
      expect(balance.data).to.eq(data)
    })

    it('throws if the data is not valid', async () => {
      const data = DevTools.createBalanceData()
      delete (data as any).currencyCode

      expect(() => {
        Balance.create({
          metadata: { from: 'did:ex:pfi' },
          data,
        })
      }).to.throw
    })
  })

  describe('sign', () => {
    it('sets signature property', async () => {
      const pfi = await DidDht.create()
      const balance = Balance.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createBalanceData()
      })


      await balance.sign(pfi)

      expect(balance.signature).to.not.be.undefined
      expect(typeof balance.signature).to.equal('string')
    })

    it('includes alg and kid in jws header', async () => {
      const pfi = await DidDht.create()
      const balance = Balance.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createBalanceData()
      })

      await balance.sign(pfi)

      const [base64UrlEncodedJwsHeader] = balance.signature!.split('.')
      const jwsHeader: { kid?: string, alg?: string} = Convert.base64Url(base64UrlEncodedJwsHeader).toObject()

      expect(jwsHeader.kid).to.equal(pfi.document.verificationMethod![0].id)
      expect(jwsHeader.alg).to.exist
    })
  })

  describe('verify', () => {
    it('does not throw an exception if resource integrity is intact', async () => {
      const pfi = await DidDht.create()
      const balance = Balance.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createBalanceData()
      })

      await balance.sign(pfi)
      await balance.verify()
    })

    it('throws an error if no signature is present on the resource provided', async () => {
      const pfi = await DidDht.create()
      const balance = Balance.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createBalanceData()
      })

      try {
        await balance.verify()
        expect.fail()
      } catch(e) {
        expect(e.message).to.include(`must have required property 'signature'`)
      }
    })
  })

  describe('parse', () => {
    it('throws an error if payload is not valid JSON', async () => {
      try {
        await Parser.parseResource(';;;)_')
        expect.fail()
      } catch(e) {
        expect(e.message).to.include('Failed to parse resource')
      }
    })

    it('returns a Resource instance if parsing is successful', async () => {
      const pfi = await DidDht.create()
      const balance = Balance.create({
        metadata : { from: pfi.uri },
        data     : DevTools.createBalanceData()
      })

      await balance.sign(pfi)

      const jsonResource = JSON.stringify(balance)
      const parsedResource = await Parser.parseResource(jsonResource)

      expect(jsonResource).to.equal(JSON.stringify(parsedResource))
    })
  })
})