import { NextRequest } from "next/server";
import { getTicket, setStatus } from "@/lib/tickets";
import { runTicketPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Escalated runs (two real model calls) can take 10-20s; give this route
// generous headroom rather than App Platform's default request timeout.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ticketId = Number(body?.ticketId);
  const ticket = getTicket(ticketId);

  if (!ticket) {
    return new Response(JSON.stringify({ error: "Unknown ticket id" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  setStatus(ticket.id, "in_progress");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };
      try {
        for await (const event of runTicketPipeline(ticket)) {
          if (event.type === "model_call" && event.tier === "strong") {
            setStatus(ticket.id, "escalated");
          }
          if (event.type === "done") {
            setStatus(ticket.id, "resolved");
          }
          send(event);
        }
      } catch (err) {
        send({ type: "fatal_error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
