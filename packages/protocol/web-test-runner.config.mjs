import { playwrightLauncher } from '@web/test-runner-playwright'

/**
 * @type {import('@web/test-runner').TestRunnerConfig}
 */
export default {
  files       : ['tests/compiled/*.spec.js'],
  playwright  : true,
  nodeResolve : true,
  browsers    : [
    playwrightLauncher({
      product: 'chromium',
    }),
    playwrightLauncher({
      product: 'firefox',
    }),
    playwrightLauncher({
      product: 'webkit',
    }),
  ],
  testsFinishTimeout : 300000,
  concurrentBrowsers : 2,
  testFramework      : {
    config: {
      timeout: '15000',
    },
  },
}