import { NextResponse } from "next/server";
import { getBoard } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tickets: getBoard() });
}
