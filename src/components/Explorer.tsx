import { useMemo, useState } from "react";
import type { Poster, PosterQuery, PosterSortKey } from "../lib/posters";
import { queryPosters } from "../lib/posters";
import { formatCompact, formatDay } from "../lib/format";
import { Avatar } from "./Avatar";
import { ProfileDisclaimer } from "./ProfileDisclaimer";

const INITIAL: PosterQuery = {
  text: "",
  onList: "any",
  block: "any",
  profile: "any",
  sortKey: "followers",
  sortDir: "desc",
};

function cellCount(value: number | null | undefined): string {
  return typeof value === "number" ? formatCompact(value) : "—";
}

export function Explorer({
  posters,
  selected,
  onSelect,
}: {
  posters: Poster[];
  selected: string | null;
  onSelect: (handle: string) => void;
}) {
  const [query, setQuery] = useState<PosterQuery>(INITIAL);
  const rows = useMemo(() => queryPosters(posters, query), [posters, query]);

  function toggleSort(key: PosterSortKey) {
    setQuery((current) => ({
      ...current,
      sortKey: key,
      sortDir: current.sortKey === key && current.sortDir === "desc" ? "asc" : "desc",
    }));
  }

  function ariaSort(key: PosterSortKey): "ascending" | "descending" | "none" {
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
          List
          <select
            value={query.onList}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                onList: event.target.value as PosterQuery["onList"],
              }))
            }
          >
            <option value="any">Any</option>
            <option value="yes">On list</option>
            <option value="no">Not on list</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Block
          <select
            value={query.block}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                block: event.target.value as PosterQuery["block"],
              }))
            }
          >
            <option value="any">Any</option>
            <option value="blocked">Blocked</option>
            <option value="not_blocked">Open</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Profile
          <select
            value={query.profile}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                profile: event.target.value as PosterQuery["profile"],
              }))
            }
          >
            <option value="any">Any</option>
            <option value="yes">Has counts</option>
            <option value="no">No counts</option>
          </select>
        </label>
      </form>

      {posters.length === 0 ? (
        <div className="empty">
          <h3>No posters in this dataset</h3>
          <p>
            Add <code>accounts[]</code> or named handles on monitor events, then ingest.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="empty">No accounts match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="poster-table">
            <caption>
              {rows.length} of {posters.length}. Posts are the public profile counter.
            </caption>
            <thead>
              <tr>
                <SortHead label="Poster" sortKey="handle" ariaSort={ariaSort("handle")} onSort={toggleSort} />
                <th scope="col">State</th>
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
                  label="Blocked"
                  sortKey="blocked_on"
                  ariaSort={ariaSort("blocked_on")}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((poster) => {
                const pressed = selected?.toLowerCase() === poster.handle.toLowerCase();
                return (
                  <tr
                    key={poster.id}
                    className={pressed ? "is-selected" : undefined}
                    onClick={() => onSelect(poster.handle)}
                  >
                    <th scope="row">
                      <a
                        className="poster-id"
                        href={`https://x.com/${poster.handle}`}
                        rel="noreferrer"
                        aria-label={`@${poster.handle}`}
                      >
                        <Avatar
                          handle={poster.handle}
                          displayName={poster.displayName}
                          size={36}
                          decorative
                        />
                        <span>
                          <span className="poster-handle">@{poster.handle}</span>
                          {poster.displayName ? (
                            <span className="poster-display">{poster.displayName}</span>
                          ) : null}
                        </span>
                      </a>
                    </th>
                    <td>
                      {poster.blockState === "blocked"
                        ? "Blocked"
                        : poster.blockState === "not_blocked"
                          ? "Open"
                          : "—"}
                    </td>
                    <td className="num">{cellCount(poster.lifetimePosts)}</td>
                    <td className="num">{cellCount(poster.followers)}</td>
                    <td>{poster.blockedOn ? formatDay(poster.blockedOn) : "—"}</td>
                  </tr>
                );
              })}
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
  sortKey: PosterSortKey;
  ariaSort: "ascending" | "descending" | "none";
  onSort: (key: PosterSortKey) => void;
}) {
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
      </button>
    </th>
  );
}
