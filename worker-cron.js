/**
 * Cloudflare Worker entry point.
 * Wraps the OpenNext-built worker and adds a scheduled (cron) handler.
 *
 * On each cron tick:
 *  1. Try the generic /api/cron/run-scheduled endpoint — finds all active
 *     routines whose schedule_cron matches the fired expression.
 *  2. If no routines are configured via the new schedule system (ran === 0),
 *     fall back to /api/cron/daily-summary for backward-compatibility.
 */

import nextWorker from "./.open-next/worker.js";

// Re-export Durable Object bindings required by Cloudflare.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export default {
  // Pass all regular requests through to the Next.js app unchanged.
  ...nextWorker,

  async scheduled(event, env, ctx) {
    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error("[scheduled] CRON_SECRET is not set — aborting");
      return;
    }

    const cronExpr = event.cron;
    console.log("[scheduled] fired cron=%s", cronExpr);

    ctx.waitUntil((async () => {
      // Step 1: try the new generic scheduler
      const newReq = new Request("https://internal/api/cron/run-scheduled", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cron: cronExpr }),
      });

      let ranCount = 0;
      try {
        const res = await nextWorker.fetch(newReq, env, ctx);
        const body = await res.json().catch(() => ({}));
        ranCount = body.ran ?? 0;
        if (!res.ok) {
          console.error("[scheduled] run-scheduled failed status=%s body=%s", res.status, JSON.stringify(body).slice(0, 200));
        } else {
          console.log("[scheduled] run-scheduled ran=%d cron=%s", ranCount, cronExpr);
        }
      } catch (err) {
        console.error("[scheduled] run-scheduled threw:", err instanceof Error ? err.message : String(err));
      }

      // Step 2: fall back to legacy daily-summary if no routines matched the new system
      if (ranCount === 0) {
        console.log("[scheduled] no schedules matched — falling back to daily-summary");
        const legacyReq = new Request("https://internal/api/cron/daily-summary", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
        });
        try {
          const res = await nextWorker.fetch(legacyReq, env, ctx);
          const text = await res.text().catch(() => "(unreadable)");
          if (!res.ok) {
            console.error("[scheduled] daily-summary fallback failed status=%s body=%s", res.status, text.slice(0, 200));
          } else {
            console.log("[scheduled] daily-summary fallback OK — %s", text.slice(0, 120));
          }
        } catch (err) {
          console.error("[scheduled] daily-summary fallback threw:", err instanceof Error ? err.message : String(err));
        }
      }
    })());
  },
};
