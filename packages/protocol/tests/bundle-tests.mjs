import { fileURLToPath } from 'node:url'

import esbuild from 'esbuild'
import path from 'node:path'
import glob from 'tiny-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

esbuild.buildSync({
  //TODO: fix test vectors spec
  entryPoints : await glob(`${__dirname}/!(test-vectors)*.spec.ts`),
  format      : 'esm',
  bundle      : true,
  sourcemap   : true,
  platform    : 'browser',
  target      : ['chrome101', 'firefox108', 'safari16'],
  outdir      : `${__dirname}/compiled`,
  define      : {
    'global': 'globalThis',
  }
})