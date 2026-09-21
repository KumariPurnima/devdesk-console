# Demo script

A ~3 minute walkthrough for presenting the DevDesk console.

## 1. Set the scene (30s)

"This is DevDesk — a support ticket comes in, and instead of a human triaging
it, an agent does. What you're about to see is real: every model call is a
live request to DigitalOcean Serverless Inference. The only simulated part is
the ticket board itself and the tool calls it makes — those stand in for
M.A.R.S. Harness Runtime and Action Gateway, which are in Private Preview."

## 2. Dispatch a low-risk ticket (45s)

Click **Dispatch AI agent** on a ticket like "Cannot invite teammates"
(category: account — won't escalate).

Narrate as events stream in:
- "Session starting — this stands in for a Harness Runtime microVM, sub-second
  cold start."
- "Now watch this triage line — that's a real call to
  `deepseek-v4-flash-0731`, DigitalOcean's cheapest serverless chat model.
  Real latency, real token count."
- "Two simulated tool calls — GitHub and Postgres — this is where Action
  Gateway would sit in production."
- "No escalation needed, ticket resolved on the cheap tier alone."

## 3. Dispatch a higher-risk ticket (60s)

Click **Dispatch AI agent** on "API returning 502 intermittently" (category:
infra — will escalate).

- "Same triage step, same cheap model."
- "But this time — category infra, so the router escalates. Watch: a second,
  real call, this time to `llama-4-maverick` — a much larger model — and it
  comes back with an actual root-cause hypothesis and a concrete next
  diagnostic step. That's not templated text, that's the model reasoning
  about this specific ticket."

## 4. Show the Agents & guardrails tab (30s)

Switch tabs. Point out:
- The two agents' model assignments (visible, pulled live from the app's own
  config)
- The token caps and escalation rule as guardrails
- The explicit "what's real vs. simulated" framing — this is a
  cost/quality-tradeoff demo of DigitalOcean's Inference Router pattern, not a
  black box

## 5. Close (15s)

"Everything you saw under 'Serverless Inference' was a real DigitalOcean API
call, on this account's real billing. The routing logic — cheap for routine
work, escalate only when needed — is exactly the pattern the managed
Inference Router automates server-side once you configure a model pool. And
the M.A.R.S. pieces you saw simulated are exactly what turns this from a demo
into unattended production infrastructure, once Private Preview access is in
place."
