export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";

export const COMMON_TIMEZONES = [
  { value: "America/New_York",    label: "Eastern Time (ET) — America/New_York" },
  { value: "America/Chicago",     label: "Central Time (CT) — America/Chicago" },
  { value: "America/Denver",      label: "Mountain Time (MT) — America/Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) — America/Los_Angeles" },
  { value: "America/Anchorage",   label: "Alaska (AKT) — America/Anchorage" },
  { value: "Pacific/Honolulu",    label: "Hawaii (HT) — Pacific/Honolulu" },
  { value: "America/Toronto",     label: "Toronto (ET) — America/Toronto" },
  { value: "America/Vancouver",   label: "Vancouver (PT) — America/Vancouver" },
  { value: "America/Mexico_City", label: "Mexico City (CT) — America/Mexico_City" },
  { value: "America/Bogota",      label: "Bogotá (COT) — America/Bogota" },
  { value: "America/Sao_Paulo",   label: "São Paulo (BRT) — America/Sao_Paulo" },
  { value: "Europe/London",       label: "London (GMT/BST) — Europe/London" },
  { value: "Europe/Paris",        label: "Paris (CET/CEST) — Europe/Paris" },
  { value: "Europe/Berlin",       label: "Berlin (CET/CEST) — Europe/Berlin" },
  { value: "Europe/Madrid",       label: "Madrid (CET/CEST) — Europe/Madrid" },
  { value: "Asia/Dubai",          label: "Dubai (GST) — Asia/Dubai" },
  { value: "Asia/Kolkata",        label: "Mumbai/Kolkata (IST) — Asia/Kolkata" },
  { value: "Asia/Tokyo",          label: "Tokyo (JST) — Asia/Tokyo" },
  { value: "Asia/Shanghai",       label: "Shanghai (CST) — Asia/Shanghai" },
  { value: "Asia/Singapore",      label: "Singapore (SGT) — Asia/Singapore" },
  { value: "Australia/Sydney",    label: "Sydney (AEST/AEDT) — Australia/Sydney" },
  { value: "UTC",                 label: "UTC" },
];

export const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/** UTC offset in minutes for a timezone (positive = UTC ahead of local, e.g. EST = +300). */
export function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  const localMs = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime();
  return Math.round((now.getTime() - localMs) / 60000);
}

/** Convert a local HH:MM in a timezone to { h, m } in UTC. */
export function localTimeToUtc(hour: number, minute: number, timezone: string): { h: number; m: number } {
  const offset = getTimezoneOffsetMinutes(timezone);
  const utcTotal = ((hour * 60 + minute + offset) % 1440 + 1440) % 1440;
  return { h: Math.floor(utcTotal / 60), m: utcTotal % 60 };
}

/** Build a UTC cron expression from schedule settings. */
export function buildCronExpression(
  frequency: ScheduleFrequency,
  time: string,
  timezone: string,
  weekday?: number,
  monthDay?: number
): string {
  if (frequency === "custom") throw new Error("Use raw expression for custom frequency");
  const [hStr, mStr] = time.split(":");
  const { h, m } = localTimeToUtc(parseInt(hStr, 10), parseInt(mStr, 10), timezone);
  switch (frequency) {
    case "daily":   return `${m} ${h} * * *`;
    case "weekly":  return `${m} ${h} * * ${weekday ?? 1}`;
    case "monthly": return `${m} ${h} ${monthDay ?? 1} * *`;
  }
}

function fmtTime(h: number, m: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  const dm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${dh}${dm} ${ampm}`;
}

/** Plain-English description of a schedule. */
export function describeCron(
  frequency: ScheduleFrequency,
  time: string,
  timezone: string,
  weekday?: number,
  monthDay?: number,
  customExpr?: string
): string {
  if (frequency === "custom") {
    return customExpr ? `Custom: ${customExpr} (UTC)` : "Custom cron expression";
  }
  const [h, m] = time.split(":").map(Number);
  const ts = fmtTime(h, m);
  switch (frequency) {
    case "daily":   return `Every day at ${ts} ${timezone}`;
    case "weekly":  return `Every ${WEEKDAYS[weekday ?? 1]} at ${ts} ${timezone}`;
    case "monthly": return `Day ${monthDay ?? 1} of every month at ${ts} ${timezone}`;
    default:        return "";
  }
}

/** Basic 5-field cron expression validation. */
export function validateCronExpression(expr: string): { valid: boolean; error?: string } {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: "Must have exactly 5 fields: minute hour day month weekday" };
  }
  const ranges = [
    { name: "minute",  min: 0, max: 59 },
    { name: "hour",    min: 0, max: 23 },
    { name: "day",     min: 1, max: 31 },
    { name: "month",   min: 1, max: 12 },
    { name: "weekday", min: 0, max: 7  },
  ];
  for (let i = 0; i < 5; i++) {
    const p = parts[i];
    if (p === "*" || /^\*\/\d+$/.test(p) || /^\d+-\d+$/.test(p) || /^(\d+,)+\d+$/.test(p)) continue;
    if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      const { min, max, name } = ranges[i];
      if (n < min || n > max) return { valid: false, error: `${name} (${n}) out of range ${min}–${max}` };
      continue;
    }
    return { valid: false, error: `Invalid ${ranges[i].name} value: "${p}"` };
  }
  return { valid: true };
}

/** Approximate next run date for a structured schedule. */
export function getNextRunDate(
  frequency: ScheduleFrequency,
  time: string,
  timezone: string,
  weekday?: number,
  monthDay?: number
): Date | null {
  if (frequency === "custom") return null;
  const [h, m] = time.split(":").map(Number);

  const now = new Date();
  const tzNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const candidate = new Date(tzNow);
  candidate.setHours(h, m, 0, 0);

  switch (frequency) {
    case "daily":
      if (candidate <= tzNow) candidate.setDate(candidate.getDate() + 1);
      break;
    case "weekly": {
      const target = weekday ?? 1;
      let diff = (target - tzNow.getDay() + 7) % 7;
      if (diff === 0 && candidate <= tzNow) diff = 7;
      candidate.setDate(tzNow.getDate() + diff);
      candidate.setHours(h, m, 0, 0);
      break;
    }
    case "monthly": {
      const target = monthDay ?? 1;
      candidate.setDate(target);
      if (candidate <= tzNow) {
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(target);
      }
      break;
    }
  }

  const offsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime();
  return new Date(candidate.getTime() + offsetMs);
}

export function formatNextRun(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
