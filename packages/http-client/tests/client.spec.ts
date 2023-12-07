import { expect } from 'chai'
import { DidDhtMethod, DidKeyMethod } from '@web5/dids'
import { TbdexHttpClient } from '../src/client.js'
import { RequestError } from '../src/errors/request-error.js'
import { http, HttpResponse } from 'msw'
// import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'
import { ResponseError } from '../src/errors/response-error.js'

describe('client', () => {
  describe('getOfferings', async () => {
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
      const keyDid = await DidKeyMethod.create()
      try {
        await TbdexHttpClient.getOfferings({ pfiDid: keyDid.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('has no PFI service entry')
      }
    })

    it('throws RequestError if service endpoint url is garbage', async () => {
      const dhtDid = await DidDhtMethod.create({
        publish  : true,
        services : [{
          type            : 'PFI',
          id              : 'pfi',
          serviceEndpoint : 'garbage'
        }]
      })
      try {
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('RequestError')
        expect(e).to.be.instanceof(RequestError)
        expect(e.message).to.include('Failed to get offerings')
        expect(e.cause).to.exist
        expect(e.cause.message).to.include('URL')
      }
    })

    it('throws ResponseError if response status is not ok', async () => {
      const dhtDid = await DidDhtMethod.create({
        publish  : true,
        services : [{
          type            : 'PFI',
          id              : 'pfi',
          serviceEndpoint : 'https://localhost:9000'
        }]
      })
      const server = setupServer(
        http.get('https://localhost:9000/offerings', () => {
          return HttpResponse.json({}, {
            status: 400
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('ResponseError')
        expect(e).to.be.instanceof(ResponseError)
        expect(e.statusCode).to.exist
        expect(e.details).to.exist
        expect(e.recipientDid).to.equal(dhtDid.did)
        expect(e.url).to.equal('https://localhost:9000/offerings')
      }
      server.resetHandlers()
      server.close()
    })

    it('throws ResponseError if response is malformed', async () => {
      const dhtDid = await DidDhtMethod.create({
        publish  : true,
        services : [{
          type            : 'PFI',
          id              : 'pfi',
          serviceEndpoint : 'https://localhost:9000'
        }]
      })
      const server = setupServer(
        http.get('https://localhost:9000/offerings', () => {
          return HttpResponse.json({
            data: '1234'
          })
        }),
      )
      server.listen()

      try {
        await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
        expect.fail()
      } catch(e) {
        expect(e.name).to.equal('Error')
        expect(e).to.be.instanceof(Error)
        expect(e.message).to.include('message: ')
      }
      server.resetHandlers()
      server.close()
    })

    it('returns offerings array if response is ok', async () => {
      const dhtDid = await DidDhtMethod.create({
        publish  : true,
        services : [{
          type            : 'PFI',
          id              : 'pfi',
          serviceEndpoint : 'https://localhost:9000'
        }]
      })
      const server = setupServer(
        http.get('https://localhost:9000/offerings', () => {
          return HttpResponse.json({
            data: []
          }, {
            status: 202
          })
        }),
      )
      server.listen()

      const offerings = await TbdexHttpClient.getOfferings({ pfiDid: dhtDid.did })
      expect(offerings).to.have.length(0)

      server.resetHandlers()
      server.close()
    })
  })
})

