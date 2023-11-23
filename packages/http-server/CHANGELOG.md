# @tbdex/http-server

## 0.20.0

### Minor Changes

- 563e036: export `CallbackError`

### Patch Changes

- @tbdex/protocol@0.20.0
- @tbdex/http-client@0.20.0

## 0.19.0

### Minor Changes

- Restructure error messages as ErrorDetail type
- Handle http-server callback errors and pass offering to RFQ handler

### Patch Changes

- @tbdex/protocol@0.19.0
- @tbdex/http-client@0.19.0

## 0.18.0

### Minor Changes

- Get Exchanges filter field name change from exchangeId to id

### Patch Changes

- Updated dependencies
  - @tbdex/http-client@0.18.0
  - @tbdex/protocol@0.18.0

## 0.17.0

### Minor Changes

- 547124f: Test CI semver automation

### Patch Changes

- Updated dependencies [547124f]
  - @tbdex/http-client@0.17.0
  - @tbdex/protocol@0.17.0

## 0.16.0

Updated dependencies

- `@tbdex/http-client@0.16.0`
- `@tbdex/protocol@0.16.0`

## 0.15.1

### Patch Changes

- 3daa119: Patch get-func-name audit failure
- Updated dependencies [3daa119]
  - @tbdex/http-client@0.15.1
  - @tbdex/protocol@0.15.1

## 0.15.0

### Minor Changes

- f085285: initialize `api` in constructor of `TbdexHttpServer`. This allows consumers to attach their own custom endpoints if needed like so:

  ```typescript
  import { TbdexHttpServer } from "@tbdex/http-server";

  const server = new TbdexHttpServer();

  server.api.post("/some-custom-endpoint", (req, res) => {
    console.log("hi");

    return res.sendStatus(202);
  });

  await server.listen(9000, () => {
    console.log("Server listening on port 9000");
  });
  ```

### Patch Changes

- Updated dependencies [0d05bb1]
  - @tbdex/http-client@0.15.0
  - @tbdex/protocol@0.15.0
