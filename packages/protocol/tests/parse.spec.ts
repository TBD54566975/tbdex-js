import { expect } from 'chai'
import { DevTools, parseMessage, parseResource } from '../src/main.js'

describe('parse.ts', () => {
  describe('parseMessage', async () => {
    it('throws if an unrecognized message kind is passed', async () => {
      const did = await DevTools.createDid()
      const unrecognizedMessageKind = {
        metadata  : { from: did.did, to: 'did:ex:pfi' },
        data      : {},
        signature : '1234',
      }

      const jsonMessage = JSON.stringify(unrecognizedMessageKind)

      try {
        await parseMessage(jsonMessage)
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('Unrecognized message kind')
      }
    })
  })

  describe('parseResource', async () => {
    it('throws if an unrecognized resource kind is passed', async () => {
      const did = await DevTools.createDid()
      const unrecognizedResourceKind = {
        metadata  : { from: did.did, to: 'did:ex:pfi' },
        data      : {},
        signature : '1234',
      }

      const jsonMessage = JSON.stringify(unrecognizedResourceKind)

      try {
        await parseResource(jsonMessage)
        expect.fail()
      } catch (e) {
        expect(e.message).to.contain('Unrecognized resource kind')
      }
    })
  })
})