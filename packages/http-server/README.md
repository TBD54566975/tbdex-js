# tbdex http server

A configurable implementation of the [tbdex http api draft specification](https://github.com/TBD54566975/tbdex/blob/main/specs/http-api/README.md)

>
> This repo is currently under construction 🚧

# Installation
```bash
npm install @tbdex/http-server
```
# Usage
```typescript
import { TbdexHttpServer } from '@tbdex/http-server'

const api = new TbdexHttpServer()

api.get('offerings', async (ctx, filter) => { /* write biz logic here */ })
api.get('exchanges', async (ctx, filter) => { /* write biz logic here */ })

api.submit('rfq', async (ctx, message) => { /* write biz logic here */ })
api.submit('order', async (ctx, message) => { /* write biz logic here */ })
api.submit('close', async (ctx, message) => { /* write biz logic here */ })


await api.listen(9000, () => {
  console.log('Server listening on port 9000')
})
```
