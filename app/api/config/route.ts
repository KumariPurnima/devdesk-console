import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Exposes only the model slugs (not the access key) so the frontend can
// display which models are actually configured on this deployment.
export async function GET() {
  return NextResponse.json({
    cheapModel: process.env.CHEAP_MODEL || "deepseek-v4-flash-0731",
    strongModel: process.env.STRONG_MODEL || "llama-4-maverick",
    hasModelAccessKey: Boolean(process.env.MODEL_ACCESS_KEY),
  });
}
