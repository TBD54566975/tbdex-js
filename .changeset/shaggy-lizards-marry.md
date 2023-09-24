---
"@tbdex/http-server": minor
---

initialize `api` in constructor of `TbdexHttpServer`. This allows consumers to attach their own custom endpoints if needed like so:

```typescript
import { TbdexHttpServer } from '@tbdex/http-server'

const server = new TbdexHttpServer()

server.api.post('/some-custom-endpoint', (req, res) => {
  console.log('hi')

  return res.sendStatus(202)
})

await server.listen(9000, () => {
  console.log('Server listening on port 9000')
})

```
