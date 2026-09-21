"use client";

import type { Ticket, TicketStatus } from "@/lib/tickets";

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "in_progress", label: "In Progress" },
  { status: "escalated", label: "Escalated" },
  { status: "resolved", label: "Resolved" },
];

export default function Board({
  tickets,
  selectedId,
  runningId,
  onSelect,
  onDispatch,
}: {
  tickets: Ticket[];
  selectedId: number | null;
  runningId: number | null;
  onSelect: (id: number) => void;
  onDispatch: (id: number) => void;
}) {
  return (
    <div className="columns">
      {COLUMNS.map((col) => {
        const items = tickets.filter((t) => t.status === col.status);
        return (
          <div className="column" key={col.status}>
            <h3>
              <span>{col.label}</span>
              <span>{items.length}</span>
            </h3>
            {items.map((t) => (
              <div
                key={t.id}
                className={`card${selectedId === t.id ? " selected" : ""}`}
                onClick={() => onSelect(t.id)}
              >
                <div className="t-id">TF-{100 + t.id}</div>
                <div className="t-title">{t.title}</div>
                <div className="t-meta">
                  {t.customer} · {t.category}
                </div>
                {col.status === "backlog" && (
                  <button
                    className="dispatch-btn"
                    disabled={runningId !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDispatch(t.id);
                    }}
                  >
                    {runningId === t.id ? "Dispatching…" : "Dispatch AI agent"}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
