# tbdex-js

This repo contains 3 npm packages:

- [`@tbdex/protocol`](./packages/protocol/) - create, parse, verify, and validate the tbdex messages and resources defined in the [protocol draft specification](https://github.com/TBD54566975/tbdex-protocol/blob/main/README.md)
- [`@tbdex/http-client`](./packages/http-client) - An HTTP client that can be used to send tbdex messages to PFIs
- [`@tbdex/http-server`](./packages/http-server) - A configurable implementation of the [tbdex http api draft specification](https://github.com/TBD54566975/tbdex-protocol/blob/main/rest-api/README.md)

# Development

This multi-package repository uses [`pnpm` workspaces](https://pnpm.io/workspaces).

## Prerequisites

### `node`

This project is using `node v20.3.0`. You can verify your `node` and `npm` installation via the terminal:

```
$ node --version
v20.3.0
```

If you don't have `node` installed, Feel free to choose whichever approach you feel the most comfortable with. If you don't have a preferred installation method, we recommend using `nvm` (aka [node version manager](https://github.com/nvm-sh/nvm)). `nvm` allows you to install and use different versions of node. It can be installed by running `brew install nvm` (assuming that you have homebrew)

Once you have installed `nvm`, install the desired node version with `nvm install vX.Y.Z`. After installation, you may run `nvm use` to automatically tell `nvm` which `node` version to use (this will be picked up from the target version noted in `.nvmrc`):

```
$> nvm use
Found '/Users/.../TBD54566975/tbdex-js/packages/protocol/.nvmrc' with version <v20.3.0>
Now using node v20.3.0 (npm v9.6.7)
```

### [`pnpm`](https://pnpm.io/)

If you don't have `pnpm` installed, choose whichever approach you feel most comfortable with [here](https://pnpm.io/installation)

> [!NOTE]
>
> it's possible that this project may work with `npm` as well but it's not guaranteed.

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

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for semver management. For motivations, see [PR description here](https://github.com/TBD54566975/tbdex-js/pull/30#issue-1910447620).

Upon opening a Pull Request, the `changeset-bot` will automatically comment ([example](https://github.com/TBD54566975/tbdex-js/pull/30#issuecomment-1732721942)) on the PR with a reminder & recommendations for managing the changeset for the given changes.

Prior to merging your branch into main, and given you have relevant semantic versioning changes, then you should run `pnpm changeset` locally. The CLI tool will walk you through a set of steps for you to define the semantic changes. This will create a randomly-named (and funnily-named) markdown file within the `.changeset/` directory. For example, see the `.changeset/sixty-tables-cheat.md` file on [this PR](https://github.com/TBD54566975/tbdex-js/pull/35/files). There is an analogy to staging a commit (using `git add`) for these markdown files, in that, they exist so that the developer can codify the semantic changes made but they don't actually update the semantic version.

Whereafter, a `pnpm changeset version` command must be executed. This command will do two things: update the version numbers in the relevant `package.json` files & also aggregate Summary notes into the relevant `CHANGELOG.md` files. In keeping with the staged commit analogy, this is akin to the actual commit. You **do not need to execute this** prior to merging your changes into the main branch. We have a GitHub Actions workflow (which uses the [Action offered by Changesets](https://github.com/changesets/action)) to automate this process.

It is recommended to merge your branch into main with the `.changet/*.md` files, at which point, the Changeset GitHub Action will automatically pick up those changes and open a PR to automate the `pnpm changeset version` execution. For example, [see this PR](https://github.com/TBD54566975/tbdex-js/pull/36).
