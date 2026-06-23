---
name: claude-gateway
description: >
  How to call Claude from any Bitsmiths app or script through the self-hosted
  Claude API gateway at claude.bitsmiths.dev, which wraps a Claude Code OAuth
  token and exposes it as an OpenAI-compatible API so calls bill against the
  $200 Claude Max subscription instead of a metered Anthropic API key or
  OpenRouter. Use this skill whenever you need an LLM call in a Bitsmiths
  internal tool, script, Trigger.dev job, or backend and you want it to run at
  zero marginal cost — or whenever you see references to CLAUDE_GATEWAY_URL,
  claude.bitsmiths.dev, the "gateway", the cabinlab/claude-code-api project, or
  an `invalid_oauth_token` error from that host. Also trigger when wiring the AI
  layer of a new internal project (SignalScout and similar) and deciding how to
  authenticate Claude calls.
---

# Claude Gateway (claude.bitsmiths.dev)

## What this is and why it exists

`claude.bitsmiths.dev` runs [cabinlab/claude-code-api](https://github.com/cabinlab/claude-code-api),
a small server that takes a **Claude Code OAuth token** and exposes it as an
**OpenAI-compatible API**. You call it exactly like the OpenAI API; behind the
scenes it drives Claude using the token tied to Ali's Claude Max subscription.

The point: **calls cost nothing extra.** A normal Anthropic API key bills
per-token, and OpenRouter does too. The gateway routes through the $200/month
Claude Max plan instead, so internal tools that make a lot of LLM calls don't
generate a separate bill. The tradeoff is that it's a single shared token, not
multi-tenant — see [When to use it](#when-to-use-it-vs-alternatives).

It's deployed on the Hetzner box under Coolify, behind Traefik with a
Let's Encrypt cert. The repo lives on the server at `/opt/claude-code-api`.

## Connection details

| Thing | Value |
|---|---|
| Base URL | `https://claude.bitsmiths.dev/v1` |
| Auth | `Authorization: Bearer <API_KEY>` |
| API key | `sk-...` — **not stored in this repo**; get the live value from the server `.env` or the admin panel (see [Regenerating the key](#regenerating-an-api-key)) |
| Models | `sonnet` (fast/default), `opus` (hardest reasoning), `haiku` (cheap/quick) |
| Chat endpoint | `POST /v1/chat/completions` (OpenAI shape) |
| Admin panel | `https://claude.bitsmiths.dev:8443/admin` (note the `:8443` HTTPS port) |

The model names are aliases — `sonnet`/`opus`/`haiku` map to the current Claude
models on the account. Use `sonnet` unless you specifically need `opus` for
hard reasoning or a final synthesis step.

**The API key can rotate.** Treat the value above as "current" rather than
permanent — if it ever stops authenticating, get the live one from the server
(`grep GATEWAY_API_KEY /opt/claude-code-api/.env` over SSH as `hetzner-coolify`)
or regenerate one from the admin panel (see [Regenerating the key](#regenerating-an-api-key)).
Don't commit the key into a public repo; put it in `.env` / env vars like any
other secret.

## Smoke test

Before wiring it into anything, confirm it's alive:

```bash
curl -s https://claude.bitsmiths.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLAUDE_GATEWAY_API_KEY" \
  -d '{"model":"sonnet","messages":[{"role":"user","content":"reply with only: OK"}],"max_tokens":10}'
```

A healthy response is a normal OpenAI `chat.completion` object with `"content":"OK"`.
If you get `{"error":{... "invalid_oauth_token" ...}}`, jump to [Troubleshooting](#troubleshooting).

## Usage

### openai npm package

It's a drop-in OpenAI client — only `baseURL` and `apiKey` change.

```ts
import OpenAI from 'openai'

const ai = new OpenAI({
  apiKey: process.env.CLAUDE_GATEWAY_API_KEY,   // the gateway key, not an OpenAI key
  baseURL: 'https://claude.bitsmiths.dev/v1',
})

const res = await ai.chat.completions.create({
  model: 'sonnet',
  messages: [{ role: 'user', content: 'Summarize this in one line: ...' }],
})
console.log(res.choices[0].message.content)
```

### Vercel AI SDK

Use `@ai-sdk/openai`'s `createOpenAI` with a custom `baseURL` (the same pattern
keywords-digger uses for OpenRouter):

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const gateway = createOpenAI({
  apiKey: process.env.CLAUDE_GATEWAY_API_KEY,
  baseURL: 'https://claude.bitsmiths.dev/v1',
})

const { text } = await generateText({
  model: gateway('sonnet'),
  prompt: 'Draft a 2-sentence cold opener for ...',
})
```

### Recommended env vars

```bash
CLAUDE_GATEWAY_URL=https://claude.bitsmiths.dev
CLAUDE_GATEWAY_API_KEY=sk-...   # get the live value from the server .env or admin panel — never commit it
```

For a **Trigger.dev cloud** job (or any hosted runtime), set both of these in
that platform's env settings — the job runs off-box, so `localhost` won't work;
it must hit the public `claude.bitsmiths.dev` URL.

## Structured output: the important caveat

`generateObject` (Vercel AI SDK) and OpenAI's native JSON/tool-calling mode rely
on the provider supporting structured-output natively. **This gateway proxies
through the Claude CLI/SDK and does not reliably support that path** — a
`generateObject` call may throw or return malformed output.

So don't reach for `generateObject` first. Instead, ask for JSON in the prompt,
call `generateText`, and parse it yourself. This is exactly why **SignalScout
uses a `callGatewayJSON` helper** rather than `generateObject` directly — it
wraps `generateText`, strips any markdown code fences, `JSON.parse`s, and
validates against a Zod schema with a retry if parsing fails.

The shape of that helper (reuse or copy it in new projects):

```ts
// Ask for JSON in the system/user prompt, then:
async function callGatewayJSON(ai, model, system, user, schema) {
  const { text } = await generateText({
    model: gateway(model),
    system,                       // include: "Return ONLY valid JSON, no prose, no code fences."
    prompt: user,
  })
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/,'').trim()
  const parsed = JSON.parse(cleaned)   // wrap in try/retry-once on failure
  return schema.parse(parsed)          // Zod validation
}
```

Key prompt move: tell the model in the system prompt to return **only** valid
JSON with no prose and no code fences, and hand it the exact schema/field list
you expect. Keep the schema definitions in one shared module (SignalScout keeps
them in `src/lib/prospect-intel/schemas.ts`) so every call validates against the
same source of truth.

Streaming (`streamText`) can also be flaky through the gateway. For backend /
background work you don't need streaming anyway — use `generateText`.

## Token & uptime behavior (read before debugging)

The gateway authenticates to Claude with an **OAuth token**, not an API key.
OAuth access tokens are short-lived (hours), but **the gateway refreshes them
itself** using the stored refresh token — observed reality: the container has
run for weeks at a stretch serving valid responses with no external babysitting.

There is a `refresh-token.sh` script on the server (`/opt/claude-code-api/`) left
over from an earlier setup, but it is **not currently cron-scheduled**, and the
gateway has been stable without it. Don't assume an external cron is keeping it
alive — the gateway's own refresh is what's working. If that internal refresh
ever fails (e.g., the refresh token itself is revoked or expires), calls start
returning `invalid_oauth_token` and you fix it manually — see Troubleshooting.

## Regenerating an API key

1. Open `https://claude.bitsmiths.dev:8443/admin` (HTTPS, port 8443).
2. Log in with the admin password (read it from the server's `.env`, or ask Ali).
3. Use the token-exchange / key UI to mint a new OpenAI-compatible key.
4. Update `CLAUDE_GATEWAY_API_KEY` wherever it's consumed (each app's env).

The server stores key→token mappings in `/opt/claude-code-api/data/keys.json`.

## Troubleshooting

**`invalid_oauth_token` / "OAuth token may be invalid or expired":**
The underlying Claude token can no longer authenticate. Fix by pushing a fresh
Claude Code OAuth token to the server and recreating the container:

1. On Ali's Mac, the live token lives in the macOS keychain under
   `Claude Code-credentials` (the `claudeAiOauth.accessToken` field, an
   `sk-ant-oat01-...` value). It refreshes whenever Claude Code is actively used.
2. SSH in as `hetzner-coolify`, set `CLAUDE_CODE_OAUTH_TOKEN=<fresh token>` in
   `/opt/claude-code-api/.env`, then recreate the container so it reloads env:
   `cd /opt/claude-code-api && docker compose -f docker-compose.override.yml up -d`.
   (`docker restart` alone does NOT reload `.env` — you must `up -d`.)
3. Re-run the smoke test.

**404 / cert errors on the admin panel:** the admin UI is on `:8443` (only the
API on `/v1` is routed through the standard 443 Traefik route). Use the explicit
port.

**`generateObject` throwing or returning junk:** expected — switch to the
`generateText` + parse pattern above. This is not a bug to fix in the gateway.

**Container check:** `ssh hetzner-coolify "docker ps --filter name=claude-gateway"`
should show it `Up ... (healthy)`. Note the health check only pings `/v1/health`;
it does NOT validate the OAuth token, so "healthy" can coexist with auth failures.
Always confirm with a real chat-completion smoke test.

## When to use it vs alternatives

**Use the gateway for:**
- Internal Bitsmiths tools, scripts, and background jobs (SignalScout, ops automation)
- Low-to-moderate volume where you want zero marginal cost on the Max plan
- Anything where you control both ends and a single shared identity is fine

**Do NOT use it for:**
- **Multi-tenant products** where each customer should bring their own key or be
  billed separately — use OpenRouter (per-user keys) or the direct Anthropic API.
- **Anything needing a hard uptime SLA or guaranteed structured-output support** —
  the gateway is a convenience layer on one OAuth token, not production-grade
  managed infrastructure. If a customer-facing feature must never return broken
  JSON or must never go down, use the direct Anthropic API.
- **High, sustained throughput** that could brush against Max-plan rate limits —
  at that point a metered API key is the honest tool.

Rule of thumb: internal + low-stakes + cost-sensitive → gateway. External +
customer-facing + reliability-sensitive → direct Anthropic API or OpenRouter.
