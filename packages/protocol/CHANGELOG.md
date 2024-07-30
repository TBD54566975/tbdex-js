# @tbdex/protocol

## 2.0.0

### Major Changes

- [#263](https://github.com/TBD54566975/tbdex-js/pull/263) [`c673b00`](https://github.com/TBD54566975/tbdex-js/commit/c673b0015b4a4cb2a954aad5e6bf233d70a0dcec) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - Updated HTTP request body to contain `message` property according to spec change.

- [#265](https://github.com/TBD54566975/tbdex-js/pull/265) [`e692ea2`](https://github.com/TBD54566975/tbdex-js/commit/e692ea209bd41df4173392f606c08ff1636e1040) Thanks [@leordev](https://github.com/leordev)! - Updated code and tests to align with latest tbDEX spec (commit 621f54f of `tbdex` repo)

### Patch Changes

- [#265](https://github.com/TBD54566975/tbdex-js/pull/265) [`e692ea2`](https://github.com/TBD54566975/tbdex-js/commit/e692ea209bd41df4173392f606c08ff1636e1040) Thanks [@leordev](https://github.com/leordev)! - Fix: use fragment in json schema refs.

## 1.1.0

### Patch Changes

- [#254](https://github.com/TBD54566975/tbdex-js/pull/254) [`ffcbb32`](https://github.com/TBD54566975/tbdex-js/commit/ffcbb320d3290a783b43e80eec29abfd5cea802c) Thanks [@nitro-neal](https://github.com/nitro-neal)! - bumped to latest version of @web5/credentials @web5/crypto @web5/common and @web5/dids

## 1.0.2

## 1.0.1

### Patch Changes

- [#233](https://github.com/TBD54566975/tbdex-js/pull/233) [`b7e3a9b`](https://github.com/TBD54566975/tbdex-js/commit/b7e3a9bdd99b2307972b27754520287a13198c28) Thanks [@leordev](https://github.com/leordev)! - Add provenance config to the build

## 1.0.0

### Major Changes

- [#229](https://github.com/TBD54566975/tbdex-js/pull/229) [`e852f25`](https://github.com/TBD54566975/tbdex-js/commit/e852f25015bccb9a378d265f516ec4f042dfb25f) Thanks [@leordev](https://github.com/leordev)! - Official tbDEX v1 release 🎉

## 0.28.0

### Minor Changes

- [#226](https://github.com/TBD54566975/tbdex-js/pull/226) [`65439c2`](https://github.com/TBD54566975/tbdex-js/commit/65439c2386901240fde35a52f72bf552ace21351) Thanks [@kirahsapong](https://github.com/kirahsapong)! - Add new `Balance` Resource type and associated server endpoint, config, and client calling methods

  Update `Offering` Resource and `RFQ` Message type to accept new simplified fields.

  Add detachable `privateData` field to `RFQ` Message type and hash data into `data` field

  Add optional `success` field to `Close` message

- [#227](https://github.com/TBD54566975/tbdex-js/pull/227) [`90ee330`](https://github.com/TBD54566975/tbdex-js/commit/90ee330bd27981da6e2bf4c992f22d86d0acbf6b) Thanks [@kirahsapong](https://github.com/kirahsapong)! - Bumps Web5 packages

## 0.27.0

### Minor Changes

- [#191](https://github.com/TBD54566975/tbdex-js/pull/191) [`46481e7`](https://github.com/TBD54566975/tbdex-js/commit/46481e7fe74111f4f8a3cc7bf3f7943843a30cf7) Thanks [@kirahsapong](https://github.com/kirahsapong)! - Introduce protocol field to messages and resources

- [#181](https://github.com/TBD54566975/tbdex-js/pull/181) [`4f45153`](https://github.com/TBD54566975/tbdex-js/commit/4f45153d19ac6722a84d6087a0e6119be32966dc) Thanks [@diehuxx](https://github.com/diehuxx)! - Remove DevTools.createDid, extractNamedCurve, and JwsHeader

- [#194](https://github.com/TBD54566975/tbdex-js/pull/194) [`1acffee`](https://github.com/TBD54566975/tbdex-js/commit/1acffeeae4fa1820b63a340fcac1ea8fae4f0219) Thanks [@kirahsapong](https://github.com/kirahsapong)! - Allows a `Close` message to proceed an `OrderStatus` message

## 0.26.1

### Patch Changes

- 5e9a7a2: Add external id to message metadata

## 0.26.0

### Minor Changes

- eba04b8: Upgrade packages web5/dids@0.4.0, web5/credentials@0.4.2, web5/crypto@0.4.0, web5/common@0.2.3

  - Deprecate did:ion and did:key in favour of did:jwk and did:dht
  - Migrate from `PortableDid` to `BearerDid` with the latest @web5/dids upgrade
  - Replaces dependency on `Web5Crypto` with `BearerDid` signer abstraction for signing operations

### Patch Changes

- 589edc3: Add exchange state machine

## 0.25.0

### Minor Changes

- 1b48ad1: Simplify types, inheritance structure, and API

### Patch Changes

- 552675c: Upgrade @noble/hashes to 1.3.3

## 0.24.0

### Minor Changes

- c471b3d: Upgrading web5 versions in protocol and http-client

### Patch Changes

- 550fe94: Replaces karma testing library with web-test-runner

## 0.23.0

### Patch Changes

- a7bc582: make required claims nullable
- 5631d32: Replace pex implementation with web5
- c3610ed: Adds more checks to validate an RFQ against a provided Offering

## 0.22.1

### Patch Changes

- 2f4c096: bump @web5/credentials dependency

## 0.22.0

### Minor Changes

- bef3ae7: Refactored `sign` to take `PortableDid` as an argument instead of `privateKeyJwk` and `kid`

## 0.21.0

### Minor Changes

- 415b234: - Added requester DID in filter passed to `ExchangesApi.getExchanges`. Prior to this change, there was no way to prevent returning exchanges that the requester wasn't a participant of
  - Added `did:dht` resolution
  - Fixed `DevTools.createJwt`

## 0.20.0

No changes

## 0.19.0

No changes

## 0.18.0

## 0.17.0

### Minor Changes

- 547124f: Test CI semver automation

## 0.16.0

Replaced CBOR with [JSON Canonicalization Scheme](https://datatracker.ietf.org/doc/html/rfc8785)

Using CBOR for deterministic serialization proved to be more difficult than originally anticipated specifically because of the lack of consistent implementations of the same CBOR sorting algorithm.

Related: <https://github.com/TBD54566975/tbdex/pull/177>

---

Refactored `Crypto`:

- Prior to this PR, `sign` allowed for either `detachedPayload` as a base64url string or `payload` as an object. If `detachedPayload` was provided, the resulting signature would be a detached JWS. If `payload` was provided, it would be JSON serialized and base64url encoded. Looking back, this felt awkward and confusing. Refactored such that `payload` is _always_ expected to be a `UInt8Array` and `detached` is now a boolean.
- Refactored `verify` similar to ^
- Added a bit more detail to TSDoc

Generally speaking, `Crypto.sign`, and `Crypto.verify` still feel conflated and a bit janky. This is largely because they support tbdex signatures (compact detached JWS) _in addition to_ JWTs. Ideally, `Crypto` would be specific to tbdex related cryptography only with most of the core cryptographic functionality coming from `@web5/crypto`. The current state of both methods is largely a holdover until `@web5/crypto` is updated
