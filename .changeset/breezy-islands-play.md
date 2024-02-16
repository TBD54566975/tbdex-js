---
"@tbdex/http-client": minor
"@tbdex/http-server": minor
"@tbdex/protocol": minor
---

Upgrade packages web5/dids@0.4.0, web5/credentials@0.4.2, web5/crypto@0.4.0, web5/common@0.2.3

* Deprecate did:ion and did:key in favour of did:jwk and did:dht
* Migrate from `PortableDid` to `BearerDid` with the latest @web5/dids upgrade
* Replaces dependency on `Web5Crypto` with `BearerDid` signer abstraction for signing operations
