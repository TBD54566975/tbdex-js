# @tbdex/http-client

## 0.16.0

### Minor Changes

- 420fbe4: ### `@tbdex/protocol`
  Replaced CBOR with [JSON Canonicalization Scheme](https://datatracker.ietf.org/doc/html/rfc8785)

  Using CBOR for deterministic serialization proved to be more difficult than originally anticipated specifically because of the lack of consistent implementations of the same CBOR sorting algorithm.

  Related: https://github.com/TBD54566975/tbdex/pull/177

  ***

  Refactored `Crypto`:

  - Prior to this PR, `sign` allowed for either `detachedPayload` as a base64url string or `payload` as an object. If `detachedPayload` was provided, the resulting signature would be a detached JWS. If `payload` was provided, it would be JSON serialized and base64url encoded. Looking back, this felt awkward and confusing. Refactored such that `payload` is _always_ expected to be a `UInt8Array` and `detached` is now a boolean.
  - Refactored `verify` similar to ^
  - Added a bit more detail to TSDoc

  Generally speaking, `Crypto.sign`, and `Crypto.verify` still feel conflated and a bit janky. This is largely because they support tbdex signatures (compact detached JWS) _in addition to_ JWTs. Ideally, `Crypto` would be specific to tbdex related cryptography only with most of the core cryptographic functionality coming from `@web5/crypto`. The current state of both methods is largely a holdover until `@web5/crypto` is updated

  ***

  ### `@tbdex/http-client`

  Updated request token generation to use refactored `Crypto` functions

### Patch Changes

- Updated dependencies [420fbe4]
  - @tbdex/protocol@0.16.0

## 0.15.1

### Patch Changes

- 3daa119: Patch get-func-name audit failure
  - @tbdex/protocol@0.15.1

## 0.15.0

### Minor Changes

- 0d05bb1: introduced methods that can be used to discover PFIs on the ION network

### Patch Changes

- @tbdex/protocol@0.15.0
