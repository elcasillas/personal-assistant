const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const DATABASE_ID = process.env.D1_DATABASE_ID!;

const BASE_URL = () =>
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await fetch(`${BASE_URL()}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.errors?.[0]?.message ?? "D1 query failed");
  }

  return (json.result?.[0]?.results ?? []) as T[];
}

export async function d1Execute(sql: string, params: unknown[] = []): Promise<void> {
  await d1Query(sql, params);
}

export async function d1Batch(
  statements: { sql: string; params?: unknown[] }[]
): Promise<void> {
  const res = await fetch(`${BASE_URL()}/batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ statements }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 batch HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.errors?.[0]?.message ?? "D1 batch failed");
  }
}
