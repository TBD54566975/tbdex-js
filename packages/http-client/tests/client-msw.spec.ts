import { expect } from 'chai'

import { setupServer, SetupServerApi } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { BearerDid, DidDht, DidJwk } from '@web5/dids';
import { DevTools, Rfq } from '@tbdex/protocol';
import { TbdexHttpClient } from '../src/client.js';
import { ErrorDetail } from '../src/main.js';

// NOTE: MSW Best practices
//
// These tests deliberately go against some of MSW's officially recommended best practices.
// In particular, these tests make request assertions (https://mswjs.io/docs/best-practices/avoid-request-assertions).
// MSW's reasoning is that request assertions tend to test implementation rather than behavior.
// This makes sense for apps where one entity controls (and can freely make changes to)
// both the client and server. However, we are implementing a spec, and must be sure that our client
// adheres precisely to the spec in the requests' url, header, and body.
//
// Though other libraries (e.g. nock) supply assertions for request url, header, and body matching out of
// the box, we choose MSW because it has support for a wide variety of environments. To adapt it for our
// use case, we make extensive use of `server.use(http.get({ once: true, ... }))` as a form of assertion.

describe('client', () => {
  let pfiServiceEndpoint: string
  let pfiDid: BearerDid
  let aliceDid: BearerDid
  let server: SetupServerApi
  
  before(() => {
    server = setupServer(
      // Init server with no default handlers.
      // We use the `server.use(http.get({ once: true, ... }))` pattern in each test.
      // See NOTE above for details.
    )

    // did:dht makes actual network calls on creation (publishing) and resolution
    server.listen({ onUnhandledRequest: 'bypass' })
  })

  beforeEach(async () => {
    pfiServiceEndpoint = 'https://fake-mocked-tbdex-server.com'
    aliceDid = await DidJwk.create()
    pfiDid = await DidDht.create({
      options: {
        services: [{
          type            : 'PFI',
          id              : 'pfi',
          serviceEndpoint : pfiServiceEndpoint
        }]
      }
    })
  })

  it('sends an RFQ to /exchanges/:exchange_id/rfq', async () => {
    const rfq = await DevTools.createRfq({ sender: aliceDid, receiver: pfiDid })
    await rfq.sign(aliceDid)

    // Set up one-time request handler that returns 200 with no message body if request matches expected
    server.use(
      http.post(
        `${pfiServiceEndpoint}/exchanges/*/rfq`,
        async ({ request, params, cookies }) => {
          const jsonBody: any = await request.json()

          try {
            expect(await Rfq.parse(jsonBody.rfq)).to.deep.equal(rfq)
          } catch (e) {
            return HttpResponse.json([{ detail: e.message }], { status: 500 })
          }

          return new HttpResponse('OK', {
            status: 200,
          })
        },
        { once: true }
      )
    )

    await TbdexHttpClient.sendMessage({ message: rfq })
  })
})