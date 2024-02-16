# @tbdex/http-client

## 0.26.0

### Minor Changes

- eba04b8: Upgrade packages web5/dids@0.4.0, web5/credentials@0.4.2, web5/crypto@0.4.0, web5/common@0.2.3

  - Deprecate did:ion and did:key in favour of did:jwk and did:dht
  - Migrate from `PortableDid` to `BearerDid` with the latest @web5/dids upgrade
  - Replaces dependency on `Web5Crypto` with `BearerDid` signer abstraction for signing operations

- 629f0c7: Stricten, tested, and remove untested code

### Patch Changes

- Updated dependencies [eba04b8]
- Updated dependencies [589edc3]
  - @tbdex/protocol@0.26.0

## 0.25.0

### Minor Changes

- 1b48ad1: Simplify types, inheritance structure, and API

### Patch Changes

- Updated dependencies [552675c]
- Updated dependencies [1b48ad1]
  - @tbdex/protocol@0.25.0

## 0.24.0

### Minor Changes

- c471b3d: Upgrading web5 versions in protocol and http-client
- 01fc636: JWT creation and verification

### Patch Changes

- 550fe94: Replaces karma testing library with web-test-runner
- Updated dependencies [550fe94]
- Updated dependencies [c471b3d]
  - @tbdex/protocol@0.24.0

## 0.23.0

### Minor Changes

- 9e1015e: Introduces custom errors types and breaking changes: functions now throw instead of return on failure

### Patch Changes

- 47105ca: Removes HttpResponse and ErrorResponse types from http-client package
- Updated dependencies [a7bc582]
- Updated dependencies [5631d32]
- Updated dependencies [c3610ed]
  - @tbdex/protocol@0.23.0

## 0.22.1

### Patch Changes

- Updated dependencies [2f4c096]
  - @tbdex/protocol@0.22.1

## 0.22.0

### Minor Changes

- bef3ae7: Refactored `generateRequestToken` to take `PortableDid` as an argument instead of `privateKeyJwk` and `kid`

### Patch Changes

- Updated dependencies [bef3ae7]
  - @tbdex/protocol@0.22.0

## 0.21.0

### Minor Changes

- 415b234: - Added requester DID in filter passed to `ExchangesApi.getExchanges`. Prior to this change, there was no way to prevent returning exchanges that the requester wasn't a participant of
  - Added `did:dht` resolution
  - Fixed `DevTools.createJwt`

### Patch Changes

- Updated dependencies [415b234]
  - @tbdex/protocol@0.21.0

## 0.20.0

### Patch Changes

- @tbdex/protocol@0.20.0

## 0.19.0

### Patch Changes

- @tbdex/protocol@0.19.0

## 0.18.0

### Minor Changes

- Get Exchanges filter field name change from exchangeId to id

### Patch Changes

- @tbdex/protocol@0.18.0

## 0.17.0

### Minor Changes

- 547124f: Test CI semver automation

### Patch Changes

- Updated dependencies [547124f]
  - @tbdex/protocol@0.17.0

## 0.16.0

Updated request token generation to use refactored `Crypto` functions

---

Updated dependencies

- `@tbdex/http-client@0.16.0`
- `@tbdex/protocol@0.16.0`
