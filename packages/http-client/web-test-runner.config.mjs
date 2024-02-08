import { playwrightLauncher } from '@web/test-runner-playwright'

const isReplitEnvironment = process.env.REPLIT_ENVIRONMENT !== undefined
let browsers = [
  playwrightLauncher({
    product: 'chromium',
  }),
]
if (!isReplitEnvironment) {
  browsers = browsers.concat([
    playwrightLauncher({
      product: 'firefox',
    }),
    playwrightLauncher({
      product: 'webkit',
    }),
  ])
}

/**
 * @type {import('@web/test-runner').TestRunnerConfig}
 */
export default {
  files       : ['tests/compiled/*.spec.js'],
  playwright  : true,
  nodeResolve : true,
  browsers    ,
  testsFinishTimeout : 300000,
  concurrentBrowsers : 2,
  testFramework      : {
    config: {
      timeout: '15000',
    },
  },
}