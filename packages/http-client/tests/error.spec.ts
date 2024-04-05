import { expect } from 'chai'
import {
  RequestTokenMissingClaimsError,
  RequestTokenSigningError,
  RequestTokenError
} from '../src/main.js'

describe('Custom error class', () => {
  it('has expected inheritance prototype chain', async () => {
    const error = new RequestTokenSigningError({ message: 'any message' })
    expect(error).to.be.instanceOf(Error)
    expect(error).to.be.instanceOf(RequestTokenError)
    expect(error).to.be.instanceOf(RequestTokenSigningError)
    expect(error).to.not.be.instanceOf(RequestTokenMissingClaimsError)
  })
})