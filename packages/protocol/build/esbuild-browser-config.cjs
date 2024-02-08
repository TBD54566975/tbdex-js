/** @type {import('esbuild').BuildOptions} */
module.exports = {
  entryPoints : ['./src/main.ts'],
  bundle      : true,
  format      : 'esm',
  sourcemap   : true,
  minify      : true,
  platform    : 'browser',
  target      : ['chrome101'],
  define      : {
    'global': 'globalThis',
  },
}
