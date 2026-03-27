# ZK Factor — Pinata Presigned URL Worker

A CloudFlare Worker that generates short-lived Pinata presigned upload URLs, keeping the Pinata JWT server-side.

## Setup

```bash
cp .dev.vars.example .dev.vars
# Fill in your PINATA_JWT in .dev.vars
npm install
```

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
# Set the secret in production:
wrangler secret put PINATA_JWT
```

## Endpoint

### `GET /presigned-url`

Returns a presigned upload URL valid for 60 seconds.

```json
{ "url": "https://uploads.pinata.cloud/v3/files/..." }
```

The client uses this URL directly to upload files to Pinata without ever seeing the JWT.
