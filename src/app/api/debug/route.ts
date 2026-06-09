export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? "set" : "MISSING",
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? "set" : "MISSING",
    D1_DATABASE_ID: process.env.D1_DATABASE_ID ? "set" : "MISSING",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "set" : "MISSING",
  });
}
