import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runUsageSync } from "@/lib/services/usage-sync";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let bearerToken: string;
  try {
    const body = await req.json();
    bearerToken = (body.bearerToken ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!bearerToken) {
    return NextResponse.json({ error: "bearerToken is required" }, { status: 400 });
  }

  const result = await runUsageSync(bearerToken);
  // Always return 200 so the client receives the full error details in the body
  return NextResponse.json(result, { status: 200 });
}
