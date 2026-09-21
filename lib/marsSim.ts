// marsSim.ts
//
// M.A.R.S. (Managed Agents Runtime Services) is in Private Preview, so this
// file SIMULATES the parts of the architecture it provides:
//   - Harness Runtime: the isolated, fast-starting execution environment each
//     agent session runs in (Firecracker microVMs, <1s cold start, ~200ms resume).
//   - Action Gateway: governed access to tools like GitHub, Postgres, Jira/Linear.
//
// Nothing here makes real network calls. Once you have M.A.R.S. access, swap
// these for real Harness Runtime session lifecycle calls and Action Gateway
// tool-call APIs (see the doctl harness-runtime beta commands).

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

export async function startSession(ticketId: number) {
  const coldStartMs = rand(180, 900);
  await sleep(coldStartMs);
  return { sessionId: `sess_${ticketId}_${Date.now()}`, coldStartMs };
}

export async function callActionGateway(tool: string) {
  const latencyMs = rand(120, 350);
  await sleep(latencyMs);
  return { tool, latencyMs };
}

export async function pauseSession() {
  await sleep(50);
  return { status: "paused" as const, resumeMs: rand(150, 250) };
}
