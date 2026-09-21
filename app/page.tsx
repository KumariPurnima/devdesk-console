"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Board from "@/components/Board";
import RunPane from "@/components/RunPane";
import AgentsTab from "@/components/AgentsTab";
import type { Ticket } from "@/lib/tickets";
import type { PipelineEvent } from "@/lib/pipeline";

type Tab = "board" | "agents";

export default function Page() {
  const [tab, setTab] = useState<Tab>("board");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [config, setConfig] = useState({
    cheapModel: "deepseek-v4-flash-0731",
    strongModel: "llama-4-maverick",
    hasModelAccessKey: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const loadTickets = useCallback(async () => {
    const res = await fetch("/api/tickets");
    const data = await res.json();
    setTickets(data.tickets);
  }, []);

  useEffect(() => {
    loadTickets();
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, [loadTickets]);

  const reset = useCallback(async () => {
    abortRef.current?.abort();
    setRunningId(null);
    setEvents([]);
    setSelectedId(null);
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    setTickets(data.tickets);
  }, []);

  const dispatch = useCallback(async (ticketId: number) => {
    setSelectedId(ticketId);
    setRunningId(ticketId);
    setEvents([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as PipelineEvent;
          setEvents((prev) => [...prev, ev]);
        }
      }
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        { type: "model_error", tier: "cheap", message: (err as Error).message, real: true },
      ]);
    } finally {
      setRunningId(null);
      loadTickets();
    }
  }, [loadTickets]);

  const selectedTicket = tickets.find((t) => t.id === selectedId) || null;

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>DevDesk — MARS agent console</h1>
          <p>
            A support ticket becomes a triaged, tool-assisted resolution —
            worked by agents on DigitalOcean. Board is simulated (stands in
            for a Jira connector); Serverless Inference calls, routing, and
            token usage below are real.
          </p>
        </div>
        <button className="reset-btn" onClick={reset}>
          reset demo
        </button>
      </header>

      <div className="tabs">
        <button className={`tab${tab === "board" ? " active" : ""}`} onClick={() => setTab("board")}>
          Board &amp; runs
        </button>
        <button className={`tab${tab === "agents" ? " active" : ""}`} onClick={() => setTab("agents")}>
          Agents &amp; guardrails
        </button>
      </div>

      {tab === "board" ? (
        <div className="board-grid">
          <Board
            tickets={tickets}
            selectedId={selectedId}
            runningId={runningId}
            onSelect={setSelectedId}
            onDispatch={dispatch}
          />
          <RunPane events={events} ticketTitle={selectedTicket?.title || null} />
        </div>
      ) : (
        <AgentsTab
          cheapModel={config.cheapModel}
          strongModel={config.strongModel}
          hasModelAccessKey={config.hasModelAccessKey}
        />
      )}

      <footer className="note">
        The board stands in for Jira — in production this is Action
        Gateway&apos;s Jira connector. Harness Runtime sessions and Action
        Gateway tool calls are simulated (M.A.R.S. is in Private Preview).
        Model routing, latency, and token counts are real DigitalOcean
        Serverless Inference calls.
      </footer>
    </div>
  );
}
