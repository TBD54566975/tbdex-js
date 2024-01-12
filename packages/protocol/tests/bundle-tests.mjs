import { fileURLToPath } from 'node:url'

import esbuild from 'esbuild'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

esbuild.buildSync({
  entryPoints: [
    `${__dirname}/close.spec.ts`,
    `${__dirname}/crypto.spec.ts`,
    `${__dirname}/offering.spec.ts`,
    `${__dirname}/rfq.spec.ts`
  ],
  format    : 'esm',
  bundle    : true,
  sourcemap : true,
  platform  : 'browser',
  target    : ['chrome101', 'firefox108', 'safari16'],
  outdir    : `${__dirname}/compiled`,
  define    : {
    'global': 'globalThis',
  },
  // inject: [`${__dirname}/buffer-polyfill.cjs`],
})