import { describe, expect, it } from "vitest";
import { queryAccounts, rankAccounts } from "./accounts";
import type { Account } from "./types";

const accounts: Account[] = [
  {
    id: "account:alpha",
    handle: "alpha",
    profile: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "public-profile",
      provenance: "Fixture public profile for sort tests.",
      lifetime_posts: 10,
      followers: 50,
      following: 1,
      created_on: "2020-01-01",
    },
    list_membership: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "list-snapshot",
      provenance: "Fixture community-list flag, not independent evidence.",
      on_list: true,
    },
    block: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "monitor-event",
      provenance: "Fixture block state.",
      state: "blocked",
    },
  },
  {
    id: "account:beta",
    handle: "beta",
    profile: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "public-profile",
      provenance: "Fixture public profile with a higher post counter.",
      lifetime_posts: 80,
      followers: 5,
      following: 9,
      created_on: "2024-05-01",
    },
  },
];

describe("account query", () => {
  const base = {
    text: "",
    onList: "any" as const,
    block: "any" as const,
    profile: "any" as const,
    sortKey: "handle" as const,
    sortDir: "asc" as const,
  };

  it("searches handles and can rank public counters without treating them as slop volume", () => {
    expect(queryAccounts(accounts, { ...base, text: "@alp" }).map((account) => account.handle)).toEqual([
      "alpha",
    ]);
    expect(queryAccounts(accounts, { ...base, onList: "yes" })).toHaveLength(1);
    expect(
      queryAccounts(accounts, { ...base, sortKey: "lifetime_posts", sortDir: "desc" }).map(
        (account) => account.handle,
      ),
    ).toEqual(["beta", "alpha"]);
    expect(rankAccounts(accounts, "followers").map((row) => row.account.handle)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(rankAccounts(accounts, "lifetime_posts")[0]?.value).toBe(80);
  });

  it("sorts accounts that lack a profile after those that have one", () => {
    const extra: Account = { id: "account:gamma", handle: "gamma" };
    const rows = queryAccounts([...accounts, extra], {
      ...base,
      sortKey: "followers",
      sortDir: "desc",
    });
    expect(rows.at(-1)?.handle).toBe("gamma");
  });
});
