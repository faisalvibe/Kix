import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Show which Redis-related env vars are set (values masked)
  const envKeys = Object.keys(process.env).filter(
    (k) => k.includes("REDIS") || k.includes("KV") || k.includes("UPSTASH")
  );

  const envInfo: Record<string, string> = {};
  for (const key of envKeys) {
    const val = process.env[key] || "";
    envInfo[key] = val ? `${val.slice(0, 8)}...${val.slice(-4)}` : "(empty)";
  }

  return NextResponse.json({
    redis_connected: !!(
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL
    ),
    env_keys_found: envKeys,
    env_masked: envInfo,
  });
}
