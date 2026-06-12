/**
 * Cloudflare Worker entry point.
 * Wraps the OpenNext-built worker and adds a scheduled (cron) handler
 * so the daily summary runs natively in Cloudflare instead of GitHub Actions.
 */

import nextWorker from "./.open-next/worker.js";

// Re-export Durable Object bindings required by Cloudflare.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export default {
  // Pass all regular requests through to the Next.js app unchanged.
  ...nextWorker,

  /**
   * Triggered by the Cloudflare cron schedule defined in wrangler.toml.
   * Calls the existing /api/cron/daily-summary endpoint internally so all
   * the routine execution logic stays in one place.
   */
  async scheduled(_event, env, ctx) {
    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error("[scheduled] CRON_SECRET is not set — aborting");
      return;
    }

    const request = new Request("https://internal/api/cron/daily-summary", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    ctx.waitUntil(
      nextWorker.fetch(request, env, ctx)
        .then(async (res) => {
          const body = await res.text().catch(() => "(unreadable)");
          if (!res.ok) {
            console.error(`[scheduled] cron failed — status=${res.status} body=${body}`);
          } else {
            console.log(`[scheduled] daily summary OK — ${body.slice(0, 120)}`);
          }
        })
        .catch((err) => {
          console.error("[scheduled] cron threw:", err instanceof Error ? err.message : String(err));
        })
    );
  },
};
