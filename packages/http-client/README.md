# tbdex http client

An HTTP client that can be used to send tbdex messages to PFIs

# Installation
```bash
npm install @tbdex/http-client
```

# Usage
```typescript
import { TbdexHttpClient } from '@tbdex/http-client'

const offerings = await TbdexHttpClient.getOfferings({ pfiDid: SOME_PFI_DID })
```