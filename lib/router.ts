// router.ts
//
// Makes REAL calls to DigitalOcean Serverless Inference
// (https://inference.do-ai.run/v1) using the OpenAI-compatible API.
//
// DigitalOcean's managed Inference Router lets you define a model pool and
// natural-language task/priority rules, and does the routing for you
// server-side. This file is a simplified stand-in for that: it picks a model
// tier itself (cheap vs. strong) based on the ticket, then calls DO's real
// endpoint for that model.
//
// IMPORTANT: not every model in the Model Catalog is Serverless-eligible —
// some are Dedicated-only. Check the "Availability" column in the catalog,
// and use the exact model ID from a model's "API Usage" tab.

import OpenAI from "openai";
import type { Ticket } from "./tickets";

const CHEAP_MODEL = process.env.CHEAP_MODEL || "deepseek-v4-flash-0731";
const STRONG_MODEL = process.env.STRONG_MODEL || "llama-4-maverick";

let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.MODEL_ACCESS_KEY) {
      throw new Error(
        "MODEL_ACCESS_KEY is not set. Copy .env.example to .env.local and add your DigitalOcean model access key."
      );
    }
    client = new OpenAI({
      baseURL: "https://inference.do-ai.run/v1/",
      apiKey: process.env.MODEL_ACCESS_KEY,
    });
  }
  return client;
}

export interface ModelCallResult {
  model: string;
  tier: "cheap" | "strong";
  text: string;
  usage: unknown;
  latencyMs: number;
}

// Escalation heuristic: infra/bug/performance/api tickets are treated as
// needing deeper root-cause analysis; everything else stays on the cheap model.
export function shouldEscalate(ticket: Ticket, triageResult: string): boolean {
  const highRiskCategories = ["infra", "bug", "performance", "api"];
  return highRiskCategories.includes(ticket.category) || /severity:\s*high/i.test(triageResult);
}

export async function triageTicket(ticket: Ticket): Promise<ModelCallResult> {
  const start = Date.now();
  const completion = await getClient().chat.completions.create({
    model: CHEAP_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a support ticket triage assistant. Classify the ticket's category and severity (low/medium/high) in one short line. Format: category: <x> | severity: <y>",
      },
      { role: "user", content: `Ticket: "${ticket.title}" from customer "${ticket.customer}".` },
    ],
    // Reasoning models spend part of the token budget on internal "thinking"
    // before the visible answer, so keep this comfortably above the minimum.
    max_tokens: 200,
  });
  const latencyMs = Date.now() - start;
  return {
    model: CHEAP_MODEL,
    tier: "cheap",
    text: completion.choices[0]?.message?.content?.trim() || "",
    usage: completion.usage,
    latencyMs,
  };
}

export async function investigateTicket(ticket: Ticket, triageText: string): Promise<ModelCallResult> {
  const start = Date.now();
  const completion = await getClient().chat.completions.create({
    model: STRONG_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a senior support engineer. Given a ticket and its triage classification, suggest a likely root cause and a next diagnostic step in 2-3 sentences.",
      },
      {
        role: "user",
        content: `Ticket: "${ticket.title}" from customer "${ticket.customer}". Triage: ${triageText}`,
      },
    ],
    max_tokens: 350,
  });
  const latencyMs = Date.now() - start;
  return {
    model: STRONG_MODEL,
    tier: "strong",
    text: completion.choices[0]?.message?.content?.trim() || "",
    usage: completion.usage,
    latencyMs,
  };
}
