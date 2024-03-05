import { expect } from 'chai'
import { spec } from '../src/spec.js'

describe('protocol version', () => {
  it('gets protocol version tag', async () => {
    const tag = spec.version
    const parsed = parseFloat(tag)

    expect(tag).to.exist
    expect(typeof parsed).to.equal('number')
  })
})
