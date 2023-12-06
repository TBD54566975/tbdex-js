import sinon from 'sinon'
import { expect } from 'chai'
import { DidDhtMethod, DidKeyMethod } from '@web5/dids'
import { TbdexHttpClient } from '../src/client.js'
import { RequestError } from '../src/errors/request-error.js'
import { ErrorDetail } from '../src/types.js'

describe('client', () => {
  before(() => {
    sinon.restore()
  })
  describe('getOfferings', () => {
    it('throws RequestError if did is pewpew', async () => {
      try {
        await TbdexHttpClient.getOfferings({ pfiDid: 'hehetroll' })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('invalidDid')
      }
    })

    it('throws RequestError if did has no PFI service endpoint', async () => {
      const did = await DidKeyMethod.create()
      try {
        await TbdexHttpClient.getOfferings({ pfiDid: did.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('has no PFI service entry')
      }
    })

    it('throws RequestError if service endpoint url is garbage', async () => {
      const did = await DidDhtMethod.create({
        publish  : true,
        services : [{
          type            : 'PFI',
          id              : 'pfi',
          serviceEndpoint : 'garbage'
        }]
      })

      try {
        await TbdexHttpClient.getOfferings({ pfiDid: did.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('Failed to get offerings')
        expect(e.cause).to.exist
        expect(e.cause.message).to.include('URL')
      }
    })
  })
})

