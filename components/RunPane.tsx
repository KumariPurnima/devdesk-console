"use client";

import type { PipelineEvent } from "@/lib/pipeline";

function renderEvent(ev: PipelineEvent, i: number) {
  switch (ev.type) {
    case "session_start":
      return (
        <div className="event session" key={i}>
          <span className="e-label">Harness Runtime</span>
          <span className="badge sim">simulated</span>
          <div className="e-body">
            session {ev.sessionId} started (cold start {Math.round(ev.coldStartMs)}ms)
          </div>
        </div>
      );
    case "tool_call":
      return (
        <div className="event tool" key={i}>
          <span className="e-label">Action Gateway</span>
          <span className="badge sim">simulated</span>
          <div className="e-body">
            {ev.tool} call ({Math.round(ev.latencyMs)}ms)
          </div>
        </div>
      );
    case "model_call":
      return (
        <div className={`event ${ev.tier === "cheap" ? "model-cheap" : "model-strong"}`} key={i}>
          <span className="e-label real">
            Serverless Inference · {ev.tier === "cheap" ? "cost-optimized" : "quality-optimized"}
          </span>
          <span className="badge real">real</span>
          <div className="e-body">{ev.text || "(empty response)"}</div>
          <div className="e-sub">
            {ev.model} · {ev.latencyMs}ms · {ev.tokens} tokens
          </div>
        </div>
      );
    case "model_error":
      return (
        <div className="event error" key={i}>
          <span className="e-label">Serverless Inference · error</span>
          <span className="badge real">real</span>
          <div className="e-body">{ev.message}</div>
        </div>
      );
    case "session_end":
      return (
        <div className="event session" key={i}>
          <span className="e-label">Harness Runtime</span>
          <span className="badge sim">simulated</span>
          <div className="e-body">session paused</div>
        </div>
      );
    case "done":
      return (
        <div className="event done" key={i}>
          <span className="e-label">Run complete</span>
          <div className="e-body">
            {ev.escalated ? "Escalated to the strong-tier model." : "Resolved on the cheap-tier model."}{" "}
            {ev.totalTokens} total tokens used.
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function RunPane({
  events,
  ticketTitle,
}: {
  events: PipelineEvent[];
  ticketTitle: string | null;
}) {
  return (
    <div className="run-pane">
      <h3>{ticketTitle ? `Run: ${ticketTitle}` : "No run yet"}</h3>
      {events.length === 0 ? (
        <div className="run-empty">
          Pick a ticket and dispatch an agent.
          <br />
          <br />
          Everything here is streamed live as it happens — the model&apos;s
          reasoning, every simulated tool call with its duration, and the real
          token count from DigitalOcean Serverless Inference.
        </div>
      ) : (
        <div>{events.map((ev, i) => renderEvent(ev, i))}</div>
      )}
    </div>
  );
}
