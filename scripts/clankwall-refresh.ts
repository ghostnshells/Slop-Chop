import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeClankwall, CLANKWALL_URL } from "../src/lib/clankwall";
import { ROOT } from "./paths";

const mode = (process.env.CLANKWALL_REFRESH ?? "").trim();
const write = process.env.CLANKWALL_REFRESH_WRITE === "1";

if (mode === "" || mode === "none" || mode === "unset") {
  console.log(
    "CLANKWALL_REFRESH is not set. Skipping. This does not call Clankwall or any other network.",
  );
  process.exit(0);
}

if (mode !== "public") {
  console.error(
    'CLANKWALL_REFRESH must be "public" to read https://clankwall.vogel.dev. Other sources are refused.',
  );
  process.exit(1);
}

interface Page {
  snapshot?: string;
  generated_at?: string;
  total?: number;
  flag_rule?: string;
  next?: string | null;
  accounts?: unknown[];
}

const accounts: unknown[] = [];
let snapshot = "";
let generatedAt = "";
let total = -1;
let flagRule = "";
let next: string | null = `${CLANKWALL_URL}/api/accounts?flag=all&limit=500`;

while (next) {
  const response = await fetch(next);
  if (!response.ok) {
    console.error(`Clankwall fetch failed (${response.status}). Last known good snapshot was left unchanged.`);
    process.exit(1);
  }
  const page = (await response.json()) as Page;
  if (!page.snapshot || page.snapshot !== (snapshot || page.snapshot)) {
    console.error("Clankwall snapshot id changed while paging. Last known good snapshot was left unchanged.");
    process.exit(1);
  }
  snapshot = page.snapshot;
  generatedAt = page.generated_at ?? generatedAt;
  total = page.total ?? total;
  flagRule = page.flag_rule ?? flagRule;
  accounts.push(...(page.accounts ?? []));
  next = page.next ? new URL(page.next, CLANKWALL_URL).href : null;
}

const parsed = normalizeClankwall(
  {
    source: CLANKWALL_URL,
    meta_all: { snapshot, generated_at: generatedAt, total, flag_rule: flagRule },
    accounts,
  },
  new Date().toISOString(),
);
if (!parsed.ok) {
  console.error(`Fetched feed failed validation.\n${parsed.errors.join("\n")}`);
  console.error("Last known good snapshot was left unchanged.");
  process.exit(1);
}

const currentPath = resolve(ROOT, "data/clankwall/current.json");
let committed = "";
try {
  const existing = JSON.parse(readFileSync(currentPath, "utf8")) as { snapshot?: string };
  committed = existing.snapshot ?? "";
} catch {
  committed = "";
}

if (committed === parsed.value.snapshot) {
  console.log(`Committed Clankwall snapshot ${committed} matches the public feed.`);
  process.exit(0);
}

if (!write) {
  console.error(
    `Public feed snapshot ${parsed.value.snapshot} is not the committed snapshot ${committed || "(none)"}. Run CLANKWALL_REFRESH=public CLANKWALL_REFRESH_WRITE=1 npm run clankwall:refresh and open a pull request. Files were not changed.`,
  );
  process.exit(1);
}

const inboxDir = resolve(ROOT, "data/clankwall/inbox");
mkdirSync(inboxDir, { recursive: true });
const inboxPath = resolve(inboxDir, `${parsed.value.snapshot}.json`);
writeFileSync(
  inboxPath,
  `${JSON.stringify(
    {
      source: CLANKWALL_URL,
      meta_all: {
        snapshot: parsed.value.snapshot,
        generated_at: parsed.value.generated_at,
        total: parsed.value.total,
        flag_rule: parsed.value.flag_rule,
      },
      accounts: parsed.value.accounts,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${inboxPath}. Run npm run clankwall:ingest and open a pull request.`);
