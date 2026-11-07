import { countableEvents } from "./aggregates";
import { membershipKind, type BlockFilter, type MembershipFilter, type ProfileFilter } from "./accounts";
import type { Account, BlockState, Dataset } from "./types";

export interface Poster {
  id: string;
  handle: string;
  displayName: string | null;
  lifetimePosts: number | null;
  followers: number | null;
  following: number | null;
  createdOn: string | null;
  profileAsOf: string | null;
  blockedOn: string | null;
  blockState: BlockState;
  onList: "yes" | "no" | "unknown";
}

export type PosterSortKey =
  | "handle"
  | "lifetime_posts"
  | "followers"
  | "following"
  | "created_on"
  | "blocked_on";

export interface PosterQuery {
  text: string;
  onList: MembershipFilter;
  block: BlockFilter;
  profile: ProfileFilter;
  sortKey: PosterSortKey;
  sortDir: "asc" | "desc";
}

export function avatarUrl(handle: string): string {
  return `https://unavatar.io/x/${encodeURIComponent(handle)}`;
}

function emptyPoster(handle: string): Poster {
  return {
    id: `account:${handle.toLowerCase()}`,
    handle,
    displayName: null,
    lifetimePosts: null,
    followers: null,
    following: null,
    createdOn: null,
    profileAsOf: null,
    blockedOn: null,
    blockState: "unknown",
    onList: "unknown",
  };
}

function applyAccount(poster: Poster, account: Account): Poster {
  const next: Poster = {
    ...poster,
    id: account.id,
    handle: account.handle,
    blockState: account.block?.state ?? poster.blockState,
    onList: membershipKind(account),
  };
  if (account.profile) {
    next.displayName = account.profile.display_name ?? next.displayName;
    next.lifetimePosts =
      typeof account.profile.lifetime_posts === "number"
        ? account.profile.lifetime_posts
        : next.lifetimePosts;
    next.followers =
      typeof account.profile.followers === "number" ? account.profile.followers : next.followers;
    next.following =
      typeof account.profile.following === "number" ? account.profile.following : next.following;
    next.createdOn = account.profile.created_on ?? next.createdOn;
    next.profileAsOf = account.profile.as_of;
  }
  if (account.block?.state === "blocked") {
    next.blockedOn = poster.blockedOn ?? account.block.as_of.slice(0, 10);
  }
  if (account.block?.state === "not_blocked") {
    next.blockedOn = null;
    next.blockState = "not_blocked";
  }
  return next;
}

export function collectPosters(dataset: Dataset): Poster[] {
  const byHandle = new Map<string, Poster>();

  for (const event of countableEvents(dataset)) {
    for (const handle of event.handles) {
      const key = handle.toLowerCase();
      const current = byHandle.get(key) ?? emptyPoster(handle);
      if (!current.blockedOn || event.date < current.blockedOn) {
        current.handle = handle;
        current.blockedOn = event.date;
        current.blockState = "blocked";
      }
      byHandle.set(key, current);
    }
  }

  for (const account of dataset.accounts) {
    const key = account.handle.toLowerCase();
    const current = byHandle.get(key) ?? emptyPoster(account.handle);
    byHandle.set(key, applyAccount(current, account));
  }

  return [...byHandle.values()].sort((a, b) =>
    a.handle.localeCompare(b.handle, undefined, { sensitivity: "base" }),
  );
}

function metric(poster: Poster, key: PosterSortKey): string | number | null {
  if (key === "handle") return poster.handle.toLowerCase();
  if (key === "lifetime_posts") return poster.lifetimePosts;
  if (key === "followers") return poster.followers;
  if (key === "following") return poster.following;
  if (key === "created_on") return poster.createdOn;
  return poster.blockedOn;
}

export function queryPosters(posters: Poster[], query: PosterQuery): Poster[] {
  const text = query.text.trim().toLowerCase().replace(/^@/, "");
  const filtered = posters.filter((poster) => {
    if (text && !poster.handle.toLowerCase().includes(text) && !(poster.displayName ?? "").toLowerCase().includes(text)) {
      return false;
    }
    if (query.onList !== "any" && poster.onList !== query.onList) return false;
    const block = poster.blockState === "unknown" ? "unknown" : poster.blockState;
    if (query.block !== "any" && block !== query.block) return false;
    const hasProfile = poster.lifetimePosts != null || poster.followers != null;
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

export function chartablePosters(posters: Poster[]): Poster[] {
  return posters.filter(
    (poster) => typeof poster.lifetimePosts === "number" && typeof poster.followers === "number",
  );
}

function handleStamp(handle: string): number {
  let stamp = 0;
  for (const char of handle.toLowerCase()) stamp = (stamp * 33 + char.charCodeAt(0)) >>> 0;
  return stamp;
}

export function wallPosters(posters: Poster[]): Poster[] {
  const withCounts = posters
    .filter((poster) => poster.followers != null)
    .sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0) || a.handle.localeCompare(b.handle));
  const rest = posters
    .filter((poster) => poster.followers == null)
    .sort((a, b) => handleStamp(a.handle) - handleStamp(b.handle));
  return [...withCounts, ...rest];
}
