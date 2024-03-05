import { expect } from 'chai'
import { protocol } from '../src/protocol.js'

describe('protocol version', () => {
  it('gets protocol version tag', async () => {
    const tag = protocol.version
    const parsed = parseFloat(tag)

    expect(tag).to.exist
    expect(parsed).to.be.instanceOf(Number)
  })
})
