import { useMemo, useState } from "react";
import {
  queryAccounts,
  type AccountQuery,
  type AccountSortKey,
} from "../lib/accounts";
import type { Account } from "../lib/types";
import { formatAsOf, formatCount, formatDay } from "../lib/format";
import { ProfileDisclaimer } from "./ProfileDisclaimer";

const INITIAL: AccountQuery = {
  text: "",
  onList: "any",
  block: "any",
  profile: "any",
  sortKey: "handle",
  sortDir: "asc",
};

function cellCount(value: number | null | undefined): string {
  return typeof value === "number" ? formatCount(value) : "—";
}

export function Explorer({ accounts }: { accounts: Account[] }) {
  const [query, setQuery] = useState<AccountQuery>(INITIAL);
  const rows = useMemo(() => queryAccounts(accounts, query), [accounts, query]);

  function toggleSort(key: AccountSortKey) {
    setQuery((current) => ({
      ...current,
      sortKey: key,
      sortDir: current.sortKey === key && current.sortDir === "desc" ? "asc" : "desc",
    }));
  }

  function ariaSort(key: AccountSortKey): "ascending" | "descending" | "none" {
    if (query.sortKey !== key) return "none";
    return query.sortDir === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="stack">
      <ProfileDisclaimer />
      <form className="filters" role="search" aria-label="Filter accounts">
        <label>
          Search handle
          <input
            type="search"
            value={query.text}
            placeholder="name without @"
            onChange={(event) => setQuery((current) => ({ ...current, text: event.target.value }))}
          />
        </label>
        <label>
          List membership
          <select
            value={query.onList}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                onList: event.target.value as AccountQuery["onList"],
              }))
            }
          >
            <option value="any">Any</option>
            <option value="yes">On the curated list</option>
            <option value="no">Not on the list</option>
            <option value="unknown">Membership not recorded</option>
          </select>
        </label>
        <label>
          Block state
          <select
            value={query.block}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                block: event.target.value as AccountQuery["block"],
              }))
            }
          >
            <option value="any">Any</option>
            <option value="blocked">Blocked</option>
            <option value="not_blocked">Not blocked</option>
            <option value="unknown">Not recorded</option>
          </select>
        </label>
        <label>
          Public profile
          <select
            value={query.profile}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                profile: event.target.value as AccountQuery["profile"],
              }))
            }
          >
            <option value="any">Any</option>
            <option value="yes">Profile snapshot present</option>
            <option value="no">No profile snapshot</option>
          </select>
        </label>
      </form>

      {accounts.length === 0 ? (
        <div className="empty">
          <h3>No public profiles in this dataset</h3>
          <p>
            Rankings and the account table stay empty on purpose. This site does not invent
            handles, follower counts, or a leaderboard, and it does not treat a lifetime post
            counter as measured AI slop volume.
          </p>
          <p>
            To fill this view without editing UI code, add an export at{" "}
            <code>data/inbox/&lt;export_id&gt;.json</code> with <code>accounts[]</code>. Each
            account id is <code>account:</code> plus the lowercase handle. Profile counters need
            their own <code>as_of</code>, <code>source</code>, and <code>provenance</code>. List
            membership, when you include it, is stored as a community assessment. Then run{" "}
            <code>npm run ingest</code>.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="empty">No accounts match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption>
              {rows.length} of {accounts.length} imported accounts. Lifetime posts are the public
              profile counter.
            </caption>
            <thead>
              <tr>
                <SortHead label="Handle" sortKey="handle" ariaSort={ariaSort("handle")} onSort={toggleSort} />
                <th scope="col">On list</th>
                <th scope="col">Block state</th>
                <SortHead
                  label="Lifetime posts (public profile)"
                  sortKey="lifetime_posts"
                  ariaSort={ariaSort("lifetime_posts")}
                  onSort={toggleSort}
                />
                <SortHead
                  label="Followers"
                  sortKey="followers"
                  ariaSort={ariaSort("followers")}
                  onSort={toggleSort}
                />
                <SortHead
                  label="Following"
                  sortKey="following"
                  ariaSort={ariaSort("following")}
                  onSort={toggleSort}
                />
                <SortHead
                  label="Created"
                  sortKey="created_on"
                  ariaSort={ariaSort("created_on")}
                  onSort={toggleSort}
                />
                <th scope="col">Profile as of</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <th scope="row">
                    <a
                      href={`https://x.com/${account.handle}`}
                      rel="noreferrer"
                    >
                      @{account.handle}
                    </a>
                  </th>
                  <td>
                    {!account.list_membership
                      ? "Not recorded"
                      : account.list_membership.on_list
                        ? "On list"
                        : "Not on list"}
                  </td>
                  <td>
                    {account.block?.state === "blocked"
                      ? "Blocked"
                      : account.block?.state === "not_blocked"
                        ? "Not blocked"
                        : "Not recorded"}
                  </td>
                  <td className="num">{cellCount(account.profile?.lifetime_posts)}</td>
                  <td className="num">{cellCount(account.profile?.followers)}</td>
                  <td className="num">{cellCount(account.profile?.following)}</td>
                  <td>
                    {account.profile?.created_on
                      ? formatDay(account.profile.created_on, "long")
                      : "—"}
                  </td>
                  <td>
                    {account.profile ? (
                      <time dateTime={account.profile.as_of}>{formatAsOf(account.profile.as_of)}</time>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortHead({
  label,
  sortKey,
  ariaSort,
  onSort,
}: {
  label: string;
  sortKey: AccountSortKey;
  ariaSort: "ascending" | "descending" | "none";
  onSort: (key: AccountSortKey) => void;
}) {
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
      </button>
    </th>
  );
}
