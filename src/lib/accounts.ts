import type { Account } from "./types";

export type MembershipFilter = "any" | "yes" | "no" | "unknown";
export type BlockFilter = "any" | "blocked" | "not_blocked" | "unknown";
export type ProfileFilter = "any" | "yes" | "no";
export type AccountSortKey =
  | "handle"
  | "lifetime_posts"
  | "followers"
  | "following"
  | "created_on";

export interface AccountQuery {
  text: string;
  onList: MembershipFilter;
  block: BlockFilter;
  profile: ProfileFilter;
  sortKey: AccountSortKey;
  sortDir: "asc" | "desc";
}

export function membershipKind(account: Account): "yes" | "no" | "unknown" {
  if (!account.list_membership) return "unknown";
  return account.list_membership.on_list ? "yes" : "no";
}

export function blockKind(account: Account): "blocked" | "not_blocked" | "unknown" {
  if (!account.block || account.block.state === "unknown") return "unknown";
  return account.block.state;
}

function metric(account: Account, key: AccountSortKey): string | number | null {
  if (key === "handle") return account.handle.toLowerCase();
  if (!account.profile) return null;
  if (key === "created_on") return account.profile.created_on ?? null;
  const value = account.profile[key];
  return typeof value === "number" ? value : null;
}

export function queryAccounts(accounts: Account[], query: AccountQuery): Account[] {
  const text = query.text.trim().toLowerCase().replace(/^@/, "");
  const filtered = accounts.filter((account) => {
    if (text && !account.handle.toLowerCase().includes(text)) return false;
    if (query.onList !== "any" && membershipKind(account) !== query.onList) return false;
    if (query.block !== "any" && blockKind(account) !== query.block) return false;
    const hasProfile = Boolean(account.profile);
    if (query.profile === "yes" && !hasProfile) return false;
    if (query.profile === "no" && hasProfile) return false;
    return true;
  });

  const direction = query.sortDir === "asc" ? 1 : -1;
  return filtered.slice().sort((a, b) => {
    const left = metric(a, query.sortKey);
    const right = metric(b, query.sortKey);
    if (left === null && right === null) return a.handle.localeCompare(b.handle);
    if (left === null) return 1;
    if (right === null) return -1;
    if (typeof left === "string" && typeof right === "string" && left !== right) {
      return direction * left.localeCompare(right);
    }
    if (typeof left === "number" && typeof right === "number" && left !== right) {
      return direction * (left - right);
    }
    return a.handle.localeCompare(b.handle);
  });
}

export interface RankedAccount {
  account: Account;
  value: number;
}

export function rankAccounts(
  accounts: Account[],
  metricName: "lifetime_posts" | "followers",
  limit = 10,
): RankedAccount[] {
  return accounts
    .flatMap((account) => {
      const value = account.profile?.[metricName];
      return typeof value === "number" ? [{ account, value }] : [];
    })
    .sort(
      (a, b) => b.value - a.value || a.account.handle.localeCompare(b.account.handle),
    )
    .slice(0, limit);
}
