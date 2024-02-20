import { Close, Message } from '../src/main.js'
import { expect } from 'chai'

describe('Close', () => {
  describe('create', () => {
    it('sets exchangeId and externalId to whatever is passed in', () => {
      const exchangeId = Message.generateId('rfq')
      const closeMessage = Close.create({
        metadata : { from: 'did:ex:alice', to: 'did:ex:pfi', exchangeId, externalId: 'ext_1234' },
        data     : { reason: 'life is hard' }
      })

      expect(closeMessage.exchangeId).to.equal(exchangeId)
      expect(closeMessage.externalId).to.equal('ext_1234')
    })
  })
})