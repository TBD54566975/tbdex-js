
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Rfq } from '../src/message-kinds/rfq.js'
import { loadOrFetchTestVector } from './fetch-test-vectors.js'

chai.use(chaiAsPromised)

describe('Test vectors: parse and serialize', () => {
  it.only('parse-rfq.json', async () => {
    const testVector = await loadOrFetchTestVector('parse-rfq.json')
    const rfq = await Rfq.parse(testVector.input)
    expect(rfq.toJSON()).to.deep.eq(testVector.output)
  })
})
