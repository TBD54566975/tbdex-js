---
"@tbdex/http-client": minor
"@tbdex/http-server": minor
"@tbdex/protocol": minor
---

- Added requester DID in filter passed to `ExchangesApi.getExchanges`. Prior to this change, there was no way to prevent returning exchanges that the requester wasn't a participant of
- Added `did:dht` resolution
- Fixed `DevTools.createJwt`
