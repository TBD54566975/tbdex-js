import { DidJwk } from '@web5/dids'
import { expect } from 'chai'
import { Parser } from '../src/main.js'

describe('Parser', () => {
  describe('parseMessage', async () => {
    it('throws if an unrecognized message kind is passed', async () => {
      const aliceDid = await DidJwk.create()
      const unrecognizedMessageKind = {
        metadata  : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data      : {},
        signature : '1234',
      }

      const jsonMessage = JSON.stringify(unrecognizedMessageKind)

      try {
        await Parser.parseMessage(jsonMessage)
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('Unrecognized message kind')
      }
    })
  })

  describe('parseResource', async () => {
    it('throws if an unrecognized resource kind is passed', async () => {
      const aliceDid = await DidJwk.create()
      const unrecognizedResourceKind = {
        metadata  : { from: aliceDid.uri, to: 'did:ex:pfi' },
        data      : {},
        signature : '1234',
      }

      const jsonMessage = JSON.stringify(unrecognizedResourceKind)

      try {
        await Parser.parseResource(jsonMessage)
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('Unrecognized resource kind')
      }
    })
  })
})