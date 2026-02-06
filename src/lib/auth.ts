import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "kix-admin-secret-change-me";

export function requireAdmin(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
