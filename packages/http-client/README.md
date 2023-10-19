# tbdex http client

An HTTP client that can be used to send tbdex messages to PFIs

# Installation
```bash
npm install @tbdex/http-client @tbdex/protocol
```

> [!NOTE]
>
> `@tbdex/protocol` is a [peer dependency](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#peerdependencies) to `@tbdex/http-client`

# Usage
```typescript
import { TbdexHttpClient } from '@tbdex/http-client'

const offerings = await TbdexHttpClient.getOfferings({ pfiDid: SOME_PFI_DID })
```