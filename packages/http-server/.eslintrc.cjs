/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  parserOptions: {
    ecmaVersion : 2022,
    sourceType  : 'module'
  },
  env: {
    node   : true,
    es2022 : true,
  },
  ignorePatterns: [
    'src/fetch.d.ts',
    'dist',
    '**/tests/compiled'
  ]
}