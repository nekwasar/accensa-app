# `@accensa/sdk`

This SDK enables merchant applications to report x402 payment settlements to an Accensa indexer.

## Reporting Settlements

Accensa supports merchant-reported route attribution via the `/api/hook/settle` webhook.

To maintain integrity, the payload is authenticated. Sellers using `@accensa/sdk` will have this handled automatically via `createSettleHook` or `attachAccensaHook`.

### Signing Contract (For Non-JS Implementers)

If you are integrating with Accensa from a non-JavaScript environment, you must construct and sign the settlement report yourself.
The reporting contract is as follows:

1. **Construct the JSON payload**:
   Create a JSON object containing the settlement details (e.g., `tx_hash`, `route`, `method`).
2. **Sign the raw request body**:
   The Ed25519 signature is generated over the exact UTF-8 bytes of the request body (the JSON string). Ensure that the bytes signed match the body sent in the HTTP request exactly.
3. **Set the header**:
   Pass the resulting signature as a hex string in the `X-Signature` HTTP header.

The backend verifies this signature before parsing the JSON, ensuring the request is strictly authenticated based on the raw bytes.

## Generated types

`SettleHookPayload` (the shape of that JSON payload) is generated from
[`apps/web/openapi.yaml`](../../apps/web/openapi.yaml), the OpenAPI spec for
the indexer API, rather than hand-declared — see
[issue #169](https://github.com/accensa/accensa-app/issues/169). This closes
the gap where the indexer's API and this SDK's types could drift apart
silently: a change to what `/api/hook/settle` accepts now shows up as a diff
in `generated/api-types.ts`, not a `400` discovered in production.

```bash
pnpm gen:api   # regenerates packages/sdk/generated/api-types.ts from the spec
```

CI regenerates the file and fails the build if it does not match what's
checked in, the same way `gen:vectors` is checked for the Merkle conformance
fixture. Only the wire type the SDK directly depends on
(`SettleHookPayload`) has been switched over so far; the spec also documents
`/api/payments`, `/api/routes`, `/api/verify` and `/api/sync` for the same
treatment later.
