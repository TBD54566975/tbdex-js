import axios from 'axios'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// TODO(diehuxx): Update this to default to a specific commit once tbdex/pull/215 is merged. Once tbdex has a defined notion of versions, use that here.
const testVectorGitRef = process.env.TEST_VECTOR_GIT_REF || 'vectors-214'

async function fetchTestVectors(commitHash) {
  const testVectorPath = 'hosted/test-vectors/protocol/vectors.json'
  const apiUrl = `https://raw.githubusercontent.com/TBD54566975/tbdex/${commitHash}/${testVectorPath}`
  const response = await axios.get(apiUrl)
  if (response.status !== 200) {
    throw `Failed to GET ${apiUrl}: ${response.error}`
  }
  return response.data
}

async function fetchCommitHash(testVectorGitRef) {
  const apiUrl = 'https://api.github.com/repos/TBD54566975/tbdex/git/refs'
  const response = await axios.get(apiUrl)
  const responseData = response.data
  const commitHash = responseData.find((ref) => ref.ref === `refs/heads/${testVectorGitRef}`)?.object?.sha
  return commitHash
}

export async function fetchOrLoadTestVectors() {
  // Check if ref is not a commit hash, get the commit hash from github API
  let commitHash
  const hexadecimalRegex = /[0-9A-Fa-f]{6}/g
  if (!hexadecimalRegex.test(testVectorGitRef)) {
    console.log(`Fetching commit hash for git ref ${testVectorGitRef}`)
    commitHash = await fetchCommitHash(testVectorGitRef)
  } else {
    commitHash = testVectorGitRef
  }

  // Check local cache for test vectors for this commit
  const testVectorsLocalPath = `${__dirname}/test-vectors-cache/vector_${commitHash}.json`
  let testVectors
  fs.readFile(testVectorsLocalPath, { encoding: 'utf-8' }, (err, data) => {
    // console.log('trying to read this file', err, data)
    if (!err) {
      console.log(`Loading test vectors from local cache at ${testVectorsLocalPath}`)
      testVectors = JSON.parse(data)
    }
  })

  // If test vectors are not available locally, fetch from github API
  if (!testVectors) {
    try {
      console.log(`Fetching test vectors for ref ${testVectorGitRef} commit ${commitHash}`)
      testVectors = await fetchTestVectors(commitHash)
    } catch (err) {
      throw `Failed to fetch test vectors: ${err}`
    }

    // Cache test vectors for this commit
    console.log(`Caching fetched test vectors`)
    const writeData = JSON.stringify(testVectors)
    fs.writeFile(testVectorsLocalPath, writeData, { flag: 'w+' }, (err) => {
      if (err) {
        console.log(`Failed to write fetched test vectors: ${err}`)
      }
    })
  }

  return testVectors
}
