import type { Dataset } from "./types";

export const CLANKWALL_URL = "https://clankwall.vogel.dev";
export const CLANKWALL_OWNER = "ryanvogel";
export const CLANKWALL_DISPUTE = "dispute-spam@ryan.ceo";

export interface ClankwallAccount {
  id: string;
  username: string;
  spam_flags: number;
  ai_flags: number;
  sampled: number;
  spam_peak: number;
  ai_peak: number | null;
}

export interface ClankwallSnapshot {
  schema_version: "1.0.0";
  snapshot: string;
  source_url: string;
  generated_at: string;
  imported_at: string;
  flag_rule: string;
  total: number;
  accounts: ClankwallAccount[];
}

export interface ClankwallHistoryEntry {
  snapshot: string;
  generated_at: string;
  imported_at: string;
  total: number;
  ai_flagged: number;
  spam_only: number;
}

export interface ClankwallHistory {
  schema_version: "1.0.0";
  entries: ClankwallHistoryEntry[];
}

export interface ClankwallSummary {
  total: number;
  aiFlagged: number;
  spamOnly: number;
  aiAtLeast: { two: number; three: number; five: number };
  distribution: Array<{ flags: number; accounts: number }>;
}

export interface BlockCoverage {
  asOf: string;
  feedSize: number;
  blocked: number;
  notBlocked: number;
  notes: string;
  xBlocksTotal: number | null;
}

export type RecordMatch = "in_our_records" | "not_in_named_records";

const USERNAME = /^[A-Za-z0-9_]{1,15}$/;
const SNAPSHOT_ID = /^[a-f0-9]{16,64}$/;

export function summarize(accounts: ClankwallAccount[]): ClankwallSummary {
  const distribution = new Map<number, number>();
  let aiFlagged = 0;
  let atLeastTwo = 0;
  let atLeastThree = 0;
  let atLeastFive = 0;
  for (const account of accounts) {
    if (account.ai_flags > 0) {
      aiFlagged += 1;
      distribution.set(account.ai_flags, (distribution.get(account.ai_flags) ?? 0) + 1);
      if (account.ai_flags >= 2) atLeastTwo += 1;
      if (account.ai_flags >= 3) atLeastThree += 1;
      if (account.ai_flags >= 5) atLeastFive += 1;
    }
  }
  return {
    total: accounts.length,
    aiFlagged,
    spamOnly: accounts.length - aiFlagged,
    aiAtLeast: { two: atLeastTwo, three: atLeastThree, five: atLeastFive },
    distribution: [...distribution.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([flags, accountsInBucket]) => ({ flags, accounts: accountsInBucket })),
  };
}

export function distributionBuckets(summary: ClankwallSummary): Array<{ label: string; accounts: number }> {
  let one = 0;
  let two = 0;
  let three = 0;
  let four = 0;
  let fivePlus = 0;
  for (const row of summary.distribution) {
    if (row.flags === 1) one += row.accounts;
    else if (row.flags === 2) two += row.accounts;
    else if (row.flags === 3) three += row.accounts;
    else if (row.flags === 4) four += row.accounts;
    else fivePlus += row.accounts;
  }
  return [
    { label: "1", accounts: one },
    { label: "2", accounts: two },
    { label: "3", accounts: three },
    { label: "4", accounts: four },
    { label: "5+", accounts: fivePlus },
  ];
}

function asAccount(value: unknown, path: string, errors: string[]): ClankwallAccount | null {
  if (!value || typeof value !== "object") {
    errors.push(`${path} is not an object`);
    return null;
  }
  const row = value as Record<string, unknown>;
  const id = row.id;
  const username = row.username;
  const spam = row.spam_flags;
  const ai = row.ai_flags;
  const sampled = row.sampled;
  const spamPeak = row.spam_peak;
  const aiPeak = row.ai_peak;
  if (typeof id !== "string" || !/^[0-9]+$/.test(id)) errors.push(`${path}.id must be a numeric string`);
  if (typeof username !== "string" || !USERNAME.test(username)) {
    errors.push(`${path}.username is not a public handle`);
  }
  for (const [name, count] of [
    ["spam_flags", spam],
    ["ai_flags", ai],
    ["sampled", sampled],
  ] as const) {
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      errors.push(`${path}.${name} must be a non-negative integer`);
    }
  }
  if (typeof spamPeak !== "number" || spamPeak < 0 || spamPeak > 1) {
    errors.push(`${path}.spam_peak must be between 0 and 1`);
  }
  if (aiPeak !== null && (typeof aiPeak !== "number" || aiPeak < 0 || aiPeak > 1)) {
    errors.push(`${path}.ai_peak must be null or between 0 and 1`);
  }
  if (
    typeof spam === "number" &&
    typeof ai === "number" &&
    typeof sampled === "number" &&
    (ai > spam || spam > sampled)
  ) {
    errors.push(`${path} has ai_flags above spam_flags or spam_flags above sampled`);
  }
  if (errors.length > 0 && errors[errors.length - 1]?.startsWith(path)) return null;
  return {
    id: id as string,
    username: username as string,
    spam_flags: spam as number,
    ai_flags: ai as number,
    sampled: sampled as number,
    spam_peak: spamPeak as number,
    ai_peak: (aiPeak ?? null) as number | null,
  };
}

function readEnvelope(input: Record<string, unknown>): {
  snapshot: unknown;
  generated_at: unknown;
  total: unknown;
  flag_rule: unknown;
  source_url: unknown;
  aiTotal: unknown;
  accounts: unknown;
} {
  const meta = input.meta_all;
  if (meta && typeof meta === "object") {
    const header = meta as Record<string, unknown>;
    const aiMeta = input.meta_ai;
    return {
      snapshot: header.snapshot,
      generated_at: header.generated_at,
      total: header.total,
      flag_rule: header.flag_rule,
      source_url: input.source ?? CLANKWALL_URL,
      aiTotal:
        aiMeta && typeof aiMeta === "object" ? (aiMeta as Record<string, unknown>).total : undefined,
      accounts: input.accounts,
    };
  }
  return {
    snapshot: input.snapshot,
    generated_at: input.generated_at,
    total: input.total,
    flag_rule: input.flag_rule,
    source_url: input.source_url ?? input.source ?? CLANKWALL_URL,
    aiTotal: undefined,
    accounts: input.accounts,
  };
}

export function normalizeClankwall(
  input: unknown,
  importedAt: string,
): { ok: true; value: ClankwallSnapshot } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { ok: false, errors: ["snapshot is not an object"] };
  const envelope = readEnvelope(input as Record<string, unknown>);
  if (typeof envelope.snapshot !== "string" || !SNAPSHOT_ID.test(envelope.snapshot)) {
    errors.push("snapshot id must be the published hex id");
  }
  if (typeof envelope.generated_at !== "string" || Number.isNaN(Date.parse(envelope.generated_at))) {
    errors.push("generated_at must be a timestamp");
  }
  if (typeof envelope.total !== "number" || !Number.isInteger(envelope.total) || envelope.total < 0) {
    errors.push("total must be a non-negative integer");
  }
  if (typeof envelope.flag_rule !== "string" || envelope.flag_rule.length < 12) {
    errors.push("flag_rule must carry the source definition");
  }
  if (typeof envelope.source_url !== "string" || !envelope.source_url.startsWith(CLANKWALL_URL)) {
    errors.push(`source must be ${CLANKWALL_URL}`);
  }
  if (!Array.isArray(envelope.accounts)) {
    errors.push("accounts must be an array");
    return { ok: false, errors };
  }
  if (typeof envelope.total === "number" && envelope.accounts.length !== envelope.total) {
    errors.push(`account count ${envelope.accounts.length} does not equal published total ${envelope.total}`);
  }
  const accounts: ClankwallAccount[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < envelope.accounts.length; index += 1) {
    const before = errors.length;
    const account = asAccount(envelope.accounts[index], `/accounts/${index}`, errors);
    if (!account || errors.length > before) continue;
    if (seen.has(account.id)) errors.push(`duplicate id ${account.id}`);
    seen.add(account.id);
    accounts.push(account);
  }
  if (errors.length > 0) return { ok: false, errors };
  const summary = summarize(accounts);
  if (typeof envelope.aiTotal === "number" && envelope.aiTotal !== summary.aiFlagged) {
    return {
      ok: false,
      errors: [`meta_ai.total ${envelope.aiTotal} does not equal ai_flags > 0 count ${summary.aiFlagged}`],
    };
  }
  return {
    ok: true,
    value: {
      schema_version: "1.0.0",
      snapshot: envelope.snapshot as string,
      source_url: CLANKWALL_URL,
      generated_at: envelope.generated_at as string,
      imported_at: importedAt,
      flag_rule: envelope.flag_rule as string,
      total: envelope.total as number,
      accounts,
    },
  };
}

export function historyEntry(snapshot: ClankwallSnapshot): ClankwallHistoryEntry {
  const summary = summarize(snapshot.accounts);
  return {
    snapshot: snapshot.snapshot,
    generated_at: snapshot.generated_at,
    imported_at: snapshot.imported_at,
    total: summary.total,
    ai_flagged: summary.aiFlagged,
    spam_only: summary.spamOnly,
  };
}

export function clankwallBlockCoverage(dataset: Dataset): BlockCoverage | null {
  const match = dataset.snapshots
    .filter(
      (snapshot) =>
        snapshot.source === "clankwall-ai-feed" &&
        typeof snapshot.list_size === "number" &&
        typeof snapshot.list_members_blocked === "number",
    )
    .sort((a, b) => a.as_of.localeCompare(b.as_of))
    .at(-1);
  if (!match || typeof match.list_size !== "number" || typeof match.list_members_blocked !== "number") {
    return null;
  }
  const notBlocked =
    typeof match.list_members_unblocked === "number"
      ? match.list_members_unblocked
      : match.list_size - match.list_members_blocked;
  return {
    asOf: match.as_of,
    feedSize: match.list_size,
    blocked: match.list_members_blocked,
    notBlocked,
    notes: match.notes,
    xBlocksTotal: typeof match.x_blocks_total === "number" ? match.x_blocks_total : null,
  };
}

export function namedBlockedHandles(dataset: Dataset): Set<string> {
  const handles = new Set<string>();
  for (const account of dataset.accounts) {
    if (account.block?.state === "blocked") handles.add(account.handle.toLowerCase());
  }
  for (const event of dataset.events) {
    if (event.status === "superseded") continue;
    for (const handle of event.handles) handles.add(handle.toLowerCase());
  }
  return handles;
}

export function recordMatch(username: string, blockedHandles: Set<string>): RecordMatch {
  return blockedHandles.has(username.toLowerCase()) ? "in_our_records" : "not_in_named_records";
}

export function matchLabel(match: RecordMatch): string {
  return match === "in_our_records" ? "In our block records" : "Not in our named records";
}
