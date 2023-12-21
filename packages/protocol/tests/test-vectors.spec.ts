
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Thingy } from '../src/thingy.js'
import { fetchOrLoadTestVectors } from './fetch-test-vectors.js'

chai.use(chaiAsPromised)

type TestVector = { description: string, input: string, output?: any, error: any }

describe.only('Test vectors: parse and serialize', () => {
  let testVectors: TestVector[] | any

  before(async () => {
    testVectors = (await fetchOrLoadTestVectors()).vectors
  })

  it('runs test vectors', async () => {
    // TODO(diehuxx): This is gonna be a nightmare to debug. How to give better test failure messages?
    for (const testVector of testVectors) {
      if (testVector.output) {
        // Expect successful output
        let thingy = await Thingy.parse(testVector.input)
        const thingyJson = thingy.toJSON()
        expect(thingyJson).to.deep.eq(testVector.output)
      } else {
        // Expect error
        expect(async () => await Thingy.parse(testVector.input)).to.eventually.throw
      }
    }
  })
})
