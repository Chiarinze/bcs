# BCS inbound mail Worker

Cloudflare Email Worker that receives the domain's catch-all mail. Replies to
`reply+<message-id>@` are posted to the app's `/api/webhooks/inbound`; all
other mail is forwarded to the Gmail inbox.

## Deploy

```bash
cd cloudflare/inbound-worker
npm install
export CLOUDFLARE_API_TOKEN=...        # token with Workers Scripts:Edit + Email Routing Rules:Edit
npx wrangler deploy
npx wrangler secret put INBOUND_WEBHOOK_SECRET   # same value as the Vercel env var
```

Then point Email Routing's catch-all at the Worker (Cloudflare → Email →
Email Routing → Catch-all → Send to a Worker → `bcs-inbound-mail`), or via the
API as done in the setup notes.

## Logs

```bash
npx wrangler tail
```
