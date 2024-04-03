# tbdex-js

[![codecov](https://codecov.io/github/TBD54566975/tbdex-js/graph/badge.svg?token=NE0263LUKG)](https://codecov.io/github/TBD54566975/tbdex-js)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/TBD54566975/tbdex-js/badge)](https://securityscorecards.dev/viewer/?uri=github.com/TBD54566975/tbdex-js)

This repo contains 3 npm packages:

- [`@tbdex/protocol`](./packages/protocol/) - create, parse, verify, and validate the tbdex messages and resources defined in the [protocol draft specification](https://github.com/TBD54566975/tbdex-protocol/blob/main/README.md)
- [`@tbdex/http-client`](./packages/http-client) - An HTTP client that can be used to send tbdex messages to PFIs
- [`@tbdex/http-server`](./packages/http-server) - A configurable implementation of the [tbdex http api draft specification](https://github.com/TBD54566975/tbdex-protocol/blob/main/rest-api/README.md)

# Development

This multi-package repository uses [`pnpm` workspaces](https://pnpm.io/workspaces).

## Prerequisites

### Cloning
This repository uses git submodules. To clone this repo with submodules
```sh
git clone --recurse-submodules git@github.com:TBD54566975/tbdex-js.git
```
Or to add submodules after cloning
```sh
git submodule update --init
```
We recommend running the command below once which will configure your environemnt to only checkout the `hosted` directory udner the `tbdex` git submodule directory, which contains files relevant to this repo, such as tbDEX spec test vectors and schemas.

```sh
git -C tbdex sparse-checkout set hosted
```

### Hermit
This project uses hermit to manage tooling like node. See [this page](https://cashapp.github.io/hermit/usage/get-started/) to set up Hermit on your machine - make sure to download the open source build and activate it for the project

Currently, we have these packages installed via Hermit (can also view by checking out `hermit status`):
- node 
- pnpm

You can run `hermit upgrade {package}` to upgrade an existing package, or `hermit install {package}` to install a new package. 
Please see [Hermit package management page](https://cashapp.github.io/hermit/usage/management/) for more details.

## Running Tests

> [!NOTE]
>
> Make sure you have all the [prerequisites](#prerequisites)

0. clone the repo and `cd` into the project directory
1. Install all project dependencies by `pnpm install`
2. Build all workspace projects in this repo by running `npm run build`
3. run tests using `pnpm test:node` to run tests within a nodejs runtime
4. run tests using `pnpm test:browser` to run tests within a browser runtime. Before doing so, run `npx playwright install --with-deps`, only required once.

## `pnpm` scripts

| Script              | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `pnpm clean`        | deletes `dist` dir and compiled tests                     |
| `pnpm test:node`    | runs tests in node runtime                                |
| `pnpm test:browser` | runs tests in headless browsers (chrome, safari, firefox) |
| `pnpm lint`         | runs linter without auto-fixing                           |
| `pnpm lint:fix`     | runs linter and applies automatic fixes wherever possible |
| `pnpm build`        | builds all distributions and dumps them into `dist`       |

## Publishing a new release

This project uses [Changesets](https://github.com/changesets/changesets) for semver management and releases. For motivations, see [PR description here](https://github.com/TBD54566975/tbdex-js/pull/30#issue-1910447620).

Release workflow:

1. Open a PR
2. `changeset-bot` will automatically [comment on the PR](https://github.com/TBD54566975/tbdex-js/pull/30#issuecomment-1732721942) with a reminder & recommendations for semver
3. Run `pnpm changeset` locally and push changes (`.changet/*.md`).  The CLI tool will walk you through a set of steps for you to define the semantic changes and create a randomly-named markdown file within `.changeset/`.
4. Merge PR into `main`.
5. Profit from the automated release pipeline:
   - [Release Workflow](./.github/workflows/release.yml) will create a new Version Package PR, or update the existing one. For example, [see this PR](https://github.com/TBD54566975/tbdex-js/pull/36). This PR updates the version numbers in the relevant `package.json` files & also aggregates the Summary notes into the relevant `CHANGELOG.md` files.
   - When maintainers are ready to publish the new changes, they will merge that PR and the very same [Release Workflow](./.github/workflows/release.yml) will automatically publish a [new version to NPM](https://www.npmjs.com/package/@tbdex/protocol?activeTab=versions), and publish the docs to https://tbd54566975.github.io/tbdex-js/

> [!NOTE]
>
> This is all achieved by the Changesets GitHub action being used in the [Release Workflow](./.github/workflows/release.yml).

## Working with the `tbdex` submodule

### Pulling
You may need to update the `tbdex` submodule after pulling.
```sh
git pull
git submodule update
```

### Pushing
If you have made changes to the `tbdex` submodule, you should push your changes to the `tbdex` remote as well as pushing changes to `tbdex-js`.
```sh
cd tbdex
git push
cd ..
git push
```
