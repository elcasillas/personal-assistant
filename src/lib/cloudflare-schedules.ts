const CF_API = "https://api.cloudflare.com/client/v4";
const WORKER_NAME = "personal-assistant";

function cfHeaders() {
  return {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/** Fetch the current list of cron triggers for the Worker. */
export async function getWorkerSchedules(): Promise<string[]> {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/schedules`,
    { headers: cfHeaders() }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare GET schedules ${res.status}: ${text}`);
  }
  const json = await res.json() as { result?: { schedules: { cron: string }[] } };
  return (json.result?.schedules ?? []).map((s) => s.cron);
}

/**
 * Replace all Worker cron triggers with the given list.
 * An empty array removes all triggers.
 */
export async function putWorkerSchedules(crons: string[]): Promise<void> {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/schedules`,
    {
      method: "PUT",
      headers: cfHeaders(),
      body: JSON.stringify({ schedules: crons.map((cron) => ({ cron })) }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare PUT schedules ${res.status}: ${text}`);
  }
}
