import { expect } from 'chai'
import { TbdexHttpClient } from '../src/main.js'

describe('client', () => {
  it('needs tests', () => {
    expect(true).to.be.true
  })
})

describe('client', () => {
  it('fetches PFIS', async () => {
    const pfis = await TbdexHttpClient.discoverPFIs()
    console.log(pfis)
    expect(pfis).to.be.an('array')
  })
})