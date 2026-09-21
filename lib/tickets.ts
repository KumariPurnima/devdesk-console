// In-memory ticket board. This is deliberately simple (no database): state
// lives in the running Node process's memory. That's fine for a single-instance
// demo, but means the board resets if the app restarts, and won't stay in sync
// if you scale the App Platform component to more than one instance.

export type TicketStatus = "backlog" | "in_progress" | "escalated" | "resolved";

export interface Ticket {
  id: number;
  title: string;
  customer: string;
  category: string;
  status: TicketStatus;
}

const seedTickets: Ticket[] = [
  { id: 1, title: "API returning 502 intermittently", customer: "Acme Corp", category: "infra", status: "backlog" },
  { id: 2, title: "Billing webhook not firing", customer: "Northwind", category: "billing", status: "backlog" },
  { id: 3, title: "SSO login loop for enterprise users", customer: "Globex", category: "auth", status: "backlog" },
  { id: 4, title: "Rate limit errors on bulk export", customer: "Initech", category: "api", status: "backlog" },
  { id: 5, title: "Dashboard charts show stale data", customer: "Umbrella", category: "frontend", status: "backlog" },
  { id: 6, title: "Cannot invite teammates", customer: "Soylent", category: "account", status: "backlog" },
  { id: 7, title: "Webhook signature validation failing", customer: "Stark Industries", category: "api", status: "backlog" },
  { id: 8, title: "Slow query on reports page", customer: "Wayne Enterprises", category: "performance", status: "backlog" },
];

// Module-level singleton — persists for the life of the Node process.
const g = globalThis as unknown as { __devdeskBoard?: Ticket[] };
if (!g.__devdeskBoard) {
  g.__devdeskBoard = seedTickets.map((t) => ({ ...t }));
}

export function getBoard(): Ticket[] {
  return g.__devdeskBoard!;
}

export function getTicket(id: number): Ticket | undefined {
  return getBoard().find((t) => t.id === id);
}

export function setStatus(id: number, status: TicketStatus): void {
  const t = getTicket(id);
  if (t) t.status = status;
}

export function resetBoard(): void {
  g.__devdeskBoard = seedTickets.map((t) => ({ ...t }));
}
