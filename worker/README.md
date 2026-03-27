# ZK Factor — Pinata Presigned URL Worker

A CloudFlare Worker that generates short-lived Pinata presigned upload URLs, keeping the Pinata JWT server-side.

## Setup

```bash
cp .dev.vars.example .dev.vars
# Fill in PINATA_JWT and PINATA_GATEWAY in .dev.vars
npm install
```

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
# Set secrets in production:
wrangler secret put PINATA_JWT
wrangler secret put PINATA_GATEWAY
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PINATA_JWT` | Yes | Pinata API JWT — never exposed to the client |
| `PINATA_GATEWAY` | No | Dedicated gateway domain (e.g. `your-gateway.mypinata.cloud`). Falls back to `gateway.pinata.cloud` |

## Endpoint

### `GET /presigned-url`

Returns a presigned upload URL (valid 60 s) and the configured gateway domain.

```json
{
  "url": "https://uploads.pinata.cloud/v3/files/...",
  "gateway": "your-gateway.mypinata.cloud"
}
```

The client uploads directly to Pinata using `url`, then constructs the public IPFS link as `https://<gateway>/ipfs/<cid>`.
