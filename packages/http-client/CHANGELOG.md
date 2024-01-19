# @tbdex/http-client

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
