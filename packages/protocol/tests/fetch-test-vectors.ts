import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { Octokit } from '@octokit/rest'

/*
 * Fetching and Caching of TBDex official test vectors, hosted at https://github.com/TBD54566975/tbdex/tree/main/hosted/test-vectors
 *
 * ENV Variables:
 * - TEST_VECTOR_GIT_REF: Specify the git-ref in the tbdex repo to pull test vectors from.
 *                        If the git ref is not a commit, we check the local cache to see if it was
 *                        associated with a commit in the past hour. If not, we fetch from Github.
 *                        The default git ref is DEFAULT_TBDEX_TEST_VECTOR_GIT_REF.
 *
 * - TEST_VECTOR_PATH: Specify a custom directory which contains test vectors. This is useful if you are editing
 *                     the tbdex repo locally and want to use the vectors in your local clone.
 *
 * - TEST_VECTOR_CACHE_DIRECTORY: Specify a custom directory where git refs and test vectors will be cached.
 *                                By default we use the <git-root>/.test-vectors-cache
 *
 */

export type TestVector = {
  description: string,
  input: string,
  output?: object,
  error: boolean,
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// By default, put test vectors at the root of the git repo
const CACHE_DIRECTORY = process.env.TEST_VECTOR_CACHE_DIRECTORY || path.join(findGitRoot(__dirname), '.test-vectors-cache')

// TODO(diehuxx): Update this to default to a specific commit/tag once tbdex/pull/215 is merged. Once tbdex has a defined notion of versions, use that here.
const DEFAULT_TBDEX_TEST_VECTOR_GIT_REF = 'vectors-214'

function findGitRoot(dir: string): string {
  dir = path.normalize(dir)
  const dirs = dir.split('/')
  while (dirs.length > 0) {
    // look up each directory to see if it contains a .git/
    const currentDir = dirs.join(path.sep)
    const fullPath = path.join(currentDir, '.git')
    if (fs.existsSync(fullPath)) {
      return currentDir
    }
    dirs.pop()
  }
  throw new Error('Could not find directory to cache test vectors')
}

function testVectorCachePath(commitHash: string, testVectorFileName: string): string {
  return path.join(CACHE_DIRECTORY, `vector_${commitHash}`, testVectorFileName)
}

async function convertGitRefToCommitHash(gitRef: string): Promise<string> {
  // if ref is already a commit hash, return the ref
  const hexadecimalRegex = /[0-9A-Fa-f]{6}/g
  if (hexadecimalRegex.test(gitRef)) {
    return gitRef
  }

  // See if git ref has a recently cached commit hash
  const cachePath = path.join(CACHE_DIRECTORY, 'git-refs', gitRef)
  try {
    // Check if cache has been recently updated
    const stats = fs.statSync(cachePath)
    const lastModifiedTimestamp = stats.mtime.getTime()
    const currentTime = Date.now()
    const oneHourAgo = currentTime - 60 * 60 * 1000

    if (lastModifiedTimestamp > oneHourAgo) {
      // Cache has been updated in the last 24 hours, so we can use it
      return await fs.promises.readFile(cachePath, { encoding: 'utf-8' })
    }
  } catch {
    // eat it just eat it. we just don't have it cached
  }

  // Fetch from github and refresh the cache
  let commitHash: string
  const octokit = new Octokit({})
  try {
    const response = await octokit.repos.getCommit({
      owner : 'TBD54566975',
      repo  : 'tbdex',
      ref   : gitRef,
    })

    commitHash = response.data.sha
  } catch (error) {
    console.error('Error fetching commit hash:', error.message)
  }

  // cache tha hash
  try {
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true })
    await fs.promises.writeFile(cachePath, commitHash, { encoding: 'utf-8' })
  } catch {
    // eat it. whatever
  }
  return commitHash
}

/**
 * 
 * @param commitHash The commit hash associated with the specified git ref
 * @param testVectorFileName The path of the test vector file from 
 * @returns 
 */
async function getCachedTestVector(commitHash: string, testVectorFileName: string): Promise<TestVector | undefined> {
  const cachePath = testVectorCachePath(commitHash, testVectorFileName)
  try {
    const content = await fs.promises.readFile(cachePath, { encoding: 'utf-8' })
    return JSON.parse(content)
  } catch (e) {
    return undefined
  }
}

async function fetchFromGithubAndCache(commitHash: string, testVectorFileName: string): Promise<void> {
  const octokit = new Octokit({})

  // Fetch from Github API
  let response
  try {
    response = await octokit.repos.getContent( {
      owner   : 'TBD54566975',
      repo    : 'tbdex',
      path    : `hosted/test-vectors/protocol/vectors/${testVectorFileName}`,
      headers : {
        'Accept'               : 'application/vnd.github+json',
        'X-GitHub-Api-Version' : '2022-11-28'
      },
      ref: commitHash
    })
  } catch (e) {
    throw new Error(`Could not fetch test vector ${testVectorFileName} at commit hash ${commitHash} from Github: ${e}`)
  }

  if (response.status !== 200) {
    throw new Error('Could not fetch test vector from Github')
  }

  // Cache test vector
  try {
    const cachePath = testVectorCachePath(commitHash, testVectorFileName)

    // Make sure directory exists
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true })

    // Write file
    const testVectorContent = Buffer.from(response.data.content, 'base64').toString()
    await fs.promises.writeFile(cachePath, testVectorContent, { flag: 'w+' })
  } catch (e) {
    throw Error(`Could not write test vector to cache: ${e}`)
  }
}

export async function loadOrFetchTestVector(testVectorFileName): Promise<TestVector> {
  const startTime = Date.now()
  let testVector: TestVector

  if (process.env.TEST_VECTOR_PATH) {
    // read test vector from specified local directory
    const testVectorsLocalPath = `${process.env.TEST_VECTOR_PATH}/${testVectorFileName}`
    try {
      const content = await fs.promises.readFile(testVectorsLocalPath, { encoding: 'utf-8' })
      return JSON.parse(content)
    } catch (e) {
      throw new Error(`Could not load test vectors from custom local path ${process.env.TEST_VECTOR_PATH}`)
    }
  }

  const gitRef = process.env.TEST_VECTOR_GIT_REF || DEFAULT_TBDEX_TEST_VECTOR_GIT_REF
  const commitHash = await convertGitRefToCommitHash(gitRef)
  console.log("converted git ref: ", Date.now() - startTime)

  // Try to get test vector from local cache
  testVector = await getCachedTestVector(commitHash, testVectorFileName)
  console.log("looked for cached test vector: ", Date.now() - startTime)


  // Fetch vectors from Github, cache them, and try again
  if (!testVector) {
    await fetchFromGithubAndCache(commitHash, testVectorFileName)
    console.log("fetched github test vector: ", Date.now() - startTime)

    testVector = await getCachedTestVector(commitHash, testVectorFileName)
    console.log("looked for cached  test vector: ", Date.now() - startTime)

  }
  // Still no vector? ErrroR
  if (!testVector) {
    throw new Error(`Could neither load from cache nor fetch from Github test vector file named ${testVectorFileName} at git ref ${gitRef}`)
  }

  return testVector
}
