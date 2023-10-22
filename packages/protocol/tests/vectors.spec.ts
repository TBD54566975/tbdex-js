import testVectors from './vectors.json' assert { type: 'json' }
import { Offering } from '../src/main.js'

describe('Vectors', () => {
  xit('works', async () => {
    const offering = await Offering.parse(testVectors.resources.offering as any)
  })
})