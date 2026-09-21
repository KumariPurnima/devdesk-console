"use client";

export default function AgentsTab({
  cheapModel,
  strongModel,
  hasModelAccessKey,
}: {
  cheapModel: string;
  strongModel: string;
  hasModelAccessKey: boolean;
}) {
  return (
    <div>
      {!hasModelAccessKey && (
        <div className="agent-card" style={{ marginBottom: 16, borderColor: "#e5534b" }}>
          <p style={{ color: "#e5534b", margin: 0 }}>
            MODEL_ACCESS_KEY is not set on this deployment — dispatch will fail
            until you add it to the app&apos;s environment variables.
          </p>
        </div>
      )}
      <div className="agents-grid">
        <div className="agent-card">
          <h4>Triage agent</h4>
          <div className="model">{cheapModel}</div>
          <p>
            Cost-optimized tier. Classifies every incoming ticket&apos;s category and
            severity. Runs on every ticket, real DigitalOcean Serverless
            Inference call, routed via the Inference Router pattern for cheap,
            high-volume work.
          </p>
          <ul className="guardrail-list">
            <li>Read-only: classification only, no writes</li>
            <li>Max 200 tokens per call</li>
            <li>Escalates on: infra / bug / performance / api category, or severity: high</li>
          </ul>
        </div>
        <div className="agent-card">
          <h4>Escalation agent</h4>
          <div className="model">{strongModel}</div>
          <p>
            Quality-optimized tier. Only invoked for tickets the triage agent
            flags as higher-risk. Produces a root-cause hypothesis and a next
            diagnostic step — a real Serverless Inference call to a larger
            model.
          </p>
          <ul className="guardrail-list">
            <li>Read-only: suggests a diagnosis, does not modify systems</li>
            <li>Max 350 tokens per call</li>
            <li>Invoked only after triage escalation, never directly</li>
          </ul>
        </div>
      </div>
      <div className="agent-card" style={{ marginTop: 16 }}>
        <h4>Harness Runtime &amp; Action Gateway</h4>
        <p>
          M.A.R.S. (Managed Agents Runtime Services) is currently in Private
          Preview. The session lifecycle (Firecracker microVM cold start,
          pause/resume) and the tool calls to GitHub, Postgres, and Jira shown
          in a run are <strong>simulated</strong> in this console. Everything
          under &quot;Serverless Inference&quot; in a run is a real call against
          your DigitalOcean account.
        </p>
      </div>
    </div>
  );
}
