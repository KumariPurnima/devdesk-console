# DevDesk console — ticket → triaged resolution

A working demo of an agentic support workflow: a ticket on a Jira-style board
is dispatched to an agent. A cheap-tier model triages it in real time; if it's
flagged as higher-risk, a second, stronger model is woken to produce a
root-cause hypothesis and next diagnostic step. Throughout, the console
streams each step **live** as it happens — the model's output, every
(simulated) tool call with its duration, and the real token count — straight
from the DevDesk pipeline's own event stream.

> The board, session lifecycle, and tool calls (GitHub, Postgres, Jira) stand
> in for M.A.R.S. Harness Runtime + Action Gateway, which are in Private
> Preview. The model routing, latency, and token accounting are **real** —
> every model call goes to DigitalOcean Serverless Inference.

This is a sibling demo to
[`mars-ticket-to-pr-console`](https://github.com/DO-Solutions/mars-ticket-to-pr-console)
(ticket → reviewed pull request), built the same way but for a different use
case: ticket → triaged, tool-assisted resolution, without requiring live
M.A.R.S. access.

## What's real vs. simulated

| Piece | Status |
|---|---|
| Ticket triage call | **Real** — `https://inference.do-ai.run/v1`, cost-optimized model |
| Escalation / root-cause call | **Real** — same endpoint, quality-optimized model, only for higher-risk tickets |
| Model routing (cheap vs. strong tier) | Simplified in-app heuristic (`lib/router.ts`); DigitalOcean's managed **Inference Router** does this server-side with a configured model pool |
| Harness Runtime sessions (cold start, pause/resume) | **Simulated** (`lib/marsSim.ts`) — M.A.R.S. is in Private Preview |
| Action Gateway tool calls (GitHub, Postgres, Jira) | **Simulated** — same reason |
| Ticket board | In-memory only, resets on restart or via the "reset demo" button |

## How it fits together

```
Browser (Board & Runs tab)
  │  click "Dispatch AI agent" on a backlog ticket
  ▼
POST /api/dispatch { ticketId }
  │  Next.js Route Handler, streams newline-delimited JSON events
  ▼
lib/pipeline.ts — async generator
  ├─ lib/marsSim.ts     : simulated Harness Runtime session start (cold start)
  ├─ lib/router.ts      : REAL triage call -> DO Serverless Inference (cheap model)
  ├─ lib/marsSim.ts     : simulated Action Gateway calls (GitHub, Postgres)
  ├─ lib/router.ts      : REAL escalation call -> DO Serverless Inference (strong model),
  │                        only if triage flags the ticket as higher-risk
  ├─ lib/marsSim.ts     : simulated Action Gateway call (Jira)
  └─ lib/marsSim.ts     : simulated Harness Runtime session pause
  ▼
Browser reads the stream chunk by chunk, appends each event to the run pane live
```

## Setup

### 1. Prerequisites

- Node.js 18.18+
- A DigitalOcean account with Serverless Inference access
- A **model access key** (Control Panel → Inference → Serverless Inference →
  Create model access key) — different from your DO account API token

### 2. Local development

```bash
npm install
cp .env.example .env.local
# edit .env.local: set MODEL_ACCESS_KEY, and check CHEAP_MODEL / STRONG_MODEL
# against what's actually enabled + Serverless-eligible on your account
npm run dev
```

Open `http://localhost:3000`. With no `MODEL_ACCESS_KEY` set, the board and UI
still work; dispatching a ticket will show a clear "MODEL_ACCESS_KEY is not
set" error in the Agents tab and a real error event in the run pane instead of
silently failing.

### 3. Picking model slugs

Not every model in the Model Catalog is Serverless-eligible — some are
Dedicated-only, and calling them via the Serverless endpoint returns a `404
model not found` that looks like a config bug but isn't one. Before setting
`CHEAP_MODEL` / `STRONG_MODEL`:

1. Control Panel → **Inference → Model Catalog**
2. Filter: **Availability: Serverless**, **Type: Chat**
3. Open a model's card → **API Usage** tab → copy the literal `model` value
   shown in the sample request (this can differ slightly from the table's
   display slug)

### 4. Deploy to DigitalOcean App Platform

Push this repo to GitHub, then either:

**Via the console:** `cloud.digitalocean.com/apps/new` → GitHub source → this
repo → build command `npm install && npm run build`, run command `npm start`,
HTTP port `8080` → add `MODEL_ACCESS_KEY` (encrypted), `CHEAP_MODEL`,
`STRONG_MODEL` as environment variables → **keep instance count at 1** (see
note below) → Create Resources.

**Via doctl:** edit `.do/app.yaml` (set your GitHub repo and model access
key), then:
```bash
doctl auth init
doctl apps create --spec .do/app.yaml
```

### Why instance count must stay at 1

The ticket board is an in-memory JavaScript object (`lib/tickets.ts`), not a
database. That's fine for a single running instance, but if you scale the App
Platform component to more than one container, each replica gets its own copy
of the board and they'll drift out of sync. Keep `instance_count: 1` unless
you add a real datastore.

## Environment variables

| Variable | Purpose |
|---|---|
| `MODEL_ACCESS_KEY` | DigitalOcean Serverless Inference auth (encrypt this one) |
| `CHEAP_MODEL` | Model slug for the triage step (cost-optimized tier) |
| `STRONG_MODEL` | Model slug for the escalation step (quality-optimized tier) |

## Troubleshooting

**Dispatch fails immediately with "model not found."** The model slug isn't
Serverless-eligible, or isn't the exact API ID. See "Picking model slugs"
above — check the model's Availability column and its API Usage tab.

**Triage response text is empty even though tokens were used.** Some models
(e.g. reasoning models) spend part of the token budget on internal reasoning
before the visible answer. If this happens, raise `max_tokens` in
`lib/router.ts`'s `triageTicket`/`investigateTicket` calls.

**Escalation call returns "403 this model is not available for your
subscription tier."** Some frontier models (e.g. certain Claude tiers) need a
higher account tier than Serverless Inference's default. Pick a different
`STRONG_MODEL` from the Serverless-filtered Model Catalog.

**Board resets unexpectedly.** The board is in-memory; any app restart
(redeploy, crash, scale-to-zero) clears it back to the seed tickets. This is
expected for a demo — see "Why instance count must stay at 1" if you want to
harden it further with a real datastore instead.

## Notes

- This console intentionally does **not** attempt real M.A.R.S. (Harness
  Runtime / Action Gateway) calls — that's Private Preview and requires a
  `doctl` beta build plus Managed Agents enabled on your team. See
  [`mars-ticket-to-pr-console`](https://github.com/DO-Solutions/mars-ticket-to-pr-console)
  for a fully-real M.A.R.S. integration (ticket → reviewed pull request use
  case) if you have that access.
- The two agents' guardrails (read-only, token caps, escalation triggers) are
  documented in the "Agents & guardrails" tab and enforced in `lib/router.ts`
  and `lib/pipeline.ts`.
