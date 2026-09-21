import { NextResponse } from "next/server";
import { resetBoard, getBoard } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function POST() {
  resetBoard();
  return NextResponse.json({ tickets: getBoard() });
}
