import { useEffect, useMemo, useRef, useState } from "react";
import type { Poster, PosterQuery, PosterSortKey } from "../lib/posters";
import { queryPosters } from "../lib/posters";
import { formatCompact, formatDay } from "../lib/format";
import { Avatar } from "./Avatar";
import { StateTag } from "./PosterChart";
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
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    const node = windowRef.current;
    const key = selected.toLowerCase();
    const row = Array.from(node?.querySelectorAll<HTMLElement>("tr[data-handle]") ?? []).find(
      (item) => item.dataset.handle === key,
    );
    if (!node || !row) return;
    const top = row.offsetTop - node.clientHeight / 2 + row.clientHeight / 2;
    node.scrollTo?.({ top: Math.max(0, top), behavior: "smooth" });
  }, [selected]);

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
    <div className="explorer">
      <form className="filters" role="search" aria-label="Filter accounts" onSubmit={(e) => e.preventDefault()}>
        <label className="filter-search">
          <span className="sr-only">Search handle</span>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query.text}
            placeholder="Search handle or name"
            onChange={(event) => setQuery((current) => ({ ...current, text: event.target.value }))}
          />
        </label>
        <label>
          <span className="filter-label">List</span>
          <select
            value={query.onList}
            onChange={(event) =>
              setQuery((current) => ({ ...current, onList: event.target.value as PosterQuery["onList"] }))
            }
          >
            <option value="any">Any</option>
            <option value="yes">On list</option>
            <option value="no">Not on list</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          <span className="filter-label">Block</span>
          <select
            value={query.block}
            onChange={(event) =>
              setQuery((current) => ({ ...current, block: event.target.value as PosterQuery["block"] }))
            }
          >
            <option value="any">Any</option>
            <option value="blocked">Blocked</option>
            <option value="not_blocked">Open</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          <span className="filter-label">Profile</span>
          <select
            value={query.profile}
            onChange={(event) =>
              setQuery((current) => ({ ...current, profile: event.target.value as PosterQuery["profile"] }))
            }
          >
            <option value="any">Any</option>
            <option value="yes">Has counts</option>
            <option value="no">No counts</option>
          </select>
        </label>
        <p className="filter-count" aria-live="polite">
          {rows.length} of {posters.length}
        </p>
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
        <div className="table-window" ref={windowRef} tabIndex={0} aria-label="Account table, scrollable">
          <table className="poster-table">
            <caption className="sr-only">
              {rows.length} of {posters.length}. Posts are the public profile counter.
            </caption>
            <thead>
              <tr>
                <SortHead label="Poster" sortKey="handle" ariaSort={ariaSort("handle")} onSort={toggleSort} />
                <th scope="col">State</th>
                <SortHead
                  label="Posts"
                  title="Lifetime posts (public profile)"
                  sortKey="lifetime_posts"
                  ariaSort={ariaSort("lifetime_posts")}
                  onSort={toggleSort}
                  numeric
                />
                <SortHead
                  label="Followers"
                  sortKey="followers"
                  ariaSort={ariaSort("followers")}
                  onSort={toggleSort}
                  numeric
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
                    data-handle={poster.handle.toLowerCase()}
                    className={pressed ? "is-selected" : undefined}
                    onClick={() => onSelect(poster.handle)}
                  >
                    <th scope="row">
                      <a
                        className="poster-id"
                        href={`https://x.com/${poster.handle}`}
                        rel="noreferrer"
                        aria-label={`@${poster.handle}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Avatar handle={poster.handle} displayName={poster.displayName} size={28} decorative />
                        <span className="poster-names">
                          <span className="poster-handle">@{poster.handle}</span>
                          {poster.displayName ? (
                            <span className="poster-display">{poster.displayName}</span>
                          ) : null}
                        </span>
                      </a>
                    </th>
                    <td>
                      <StateTag poster={poster} />
                    </td>
                    <td className="num">{cellCount(poster.lifetimePosts)}</td>
                    <td className="num">{cellCount(poster.followers)}</td>
                    <td className="mono dim">{poster.blockedOn ? formatDay(poster.blockedOn) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ProfileDisclaimer />
    </div>
  );
}

function SortHead({
  label,
  title,
  sortKey,
  ariaSort,
  onSort,
  numeric = false,
}: {
  label: string;
  title?: string;
  sortKey: PosterSortKey;
  ariaSort: "ascending" | "descending" | "none";
  onSort: (key: PosterSortKey) => void;
  numeric?: boolean;
}) {
  const arrow = ariaSort === "ascending" ? "↑" : ariaSort === "descending" ? "↓" : "";
  return (
    <th scope="col" aria-sort={ariaSort} className={numeric ? "num" : undefined}>
      <button type="button" title={title} onClick={() => onSort(sortKey)}>
        {label}
        <span className="sort-arrow" aria-hidden="true">
          {arrow}
        </span>
      </button>
    </th>
  );
}
