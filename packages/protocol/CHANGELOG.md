# @tbdex/protocol

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
