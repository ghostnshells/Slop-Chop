const COUNT = new Intl.NumberFormat("en-US");

const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const LONG_DAY = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const AS_OF = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const SOURCE_LABELS: Record<string, string> = {
  "routine-journal": "Routine journal",
  "eod-verify": "End-of-day verify",
  "approved-batch-verify": "Approved batch verify",
  "routine-verify": "Routine verify",
  "public-profile": "Public profile",
  "list-snapshot": "List snapshot",
  "monitor-event": "Monitor event",
  "grok-bot-verified-log": "Grok Bot verified log",
  "example-only": "Example only",
};

export function formatCount(value: number): string {
  return COUNT.format(value);
}

export function formatDay(date: string, style: "short" | "long" = "short"): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (style === "long" ? LONG_DAY : DAY).format(utc);
}

export function formatAsOf(asOf: string): string {
  return AS_OF.format(new Date(asOf));
}

export function formatSlot(slot: string): string {
  const [hourText, minute] = slot.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${suffix} ET`;
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function statusLabel(status: string): string {
  if (status === "partial") return "Partial";
  if (status === "complete") return "Complete";
  if (status === "superseded") return "Superseded";
  if (status === "interrupted") return "Interrupted";
  if (status === "open") return "Open";
  if (status === "done") return "Done";
  return status;
}
