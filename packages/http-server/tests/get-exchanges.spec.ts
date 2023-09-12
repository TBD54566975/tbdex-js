// import type { ErrorResponse } from '@tbdex/http-client'
import type { Server } from 'http'

import { TbdexHttpServer } from '../src/main.js'
// import { expect } from 'chai'

let api = new TbdexHttpServer()
let server: Server

describe('GET /exchanges', () => {
  before(() => {
    server = api.listen(8000)
  })

  after(() => {
    server.close()
    server.closeAllConnections()
  })

  xit('needs tests')
})