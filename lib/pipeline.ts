// pipeline.ts — the DevDesk agent pipeline, expressed as an async generator so
// the API route can stream each step to the console as it happens (the same
// "live event feed" idea as MARS session events, just simulated for the
// Harness Runtime / Action Gateway portions).

import { startSession, callActionGateway, pauseSession } from "./marsSim";
import { triageTicket, investigateTicket, shouldEscalate } from "./router";
import type { Ticket } from "./tickets";

export type PipelineEvent =
  | { type: "session_start"; sessionId: string; coldStartMs: number; real: false }
  | { type: "model_call"; tier: "cheap" | "strong"; model: string; text: string; latencyMs: number; tokens: number; real: true }
  | { type: "model_error"; tier: "cheap" | "strong"; message: string; real: true }
  | { type: "tool_call"; tool: string; latencyMs: number; real: false }
  | { type: "session_end"; real: false }
  | { type: "done"; escalated: boolean; totalTokens: number };

function usageTokens(usage: unknown): number {
  if (usage && typeof usage === "object" && "total_tokens" in usage) {
    const v = (usage as { total_tokens?: unknown }).total_tokens;
    return typeof v === "number" ? v : 0;
  }
  return 0;
}

export async function* runTicketPipeline(ticket: Ticket): AsyncGenerator<PipelineEvent> {
  let totalTokens = 0;
  let escalated = false;

  const session = await startSession(ticket.id);
  yield { type: "session_start", sessionId: session.sessionId, coldStartMs: session.coldStartMs, real: false };

  let triageText = "";
  try {
    const triage = await triageTicket(ticket);
    triageText = triage.text;
    totalTokens += usageTokens(triage.usage);
    yield {
      type: "model_call",
      tier: "cheap",
      model: triage.model,
      text: triage.text,
      latencyMs: triage.latencyMs,
      tokens: usageTokens(triage.usage),
      real: true,
    };
  } catch (err) {
    yield { type: "model_error", tier: "cheap", message: (err as Error).message, real: true };
    yield { type: "session_end", real: false };
    yield { type: "done", escalated: false, totalTokens };
    return;
  }

  const github = await callActionGateway("GitHub");
  yield { type: "tool_call", tool: github.tool, latencyMs: github.latencyMs, real: false };
  const postgres = await callActionGateway("Postgres");
  yield { type: "tool_call", tool: postgres.tool, latencyMs: postgres.latencyMs, real: false };

  if (shouldEscalate(ticket, triageText)) {
    escalated = true;
    try {
      const investigation = await investigateTicket(ticket, triageText);
      totalTokens += usageTokens(investigation.usage);
      yield {
        type: "model_call",
        tier: "strong",
        model: investigation.model,
        text: investigation.text,
        latencyMs: investigation.latencyMs,
        tokens: usageTokens(investigation.usage),
        real: true,
      };
    } catch (err) {
      yield { type: "model_error", tier: "strong", message: (err as Error).message, real: true };
    }
  }

  const jira = await callActionGateway("Jira");
  yield { type: "tool_call", tool: jira.tool, latencyMs: jira.latencyMs, real: false };

  await pauseSession();
  yield { type: "session_end", real: false };
  yield { type: "done", escalated, totalTokens };
}
