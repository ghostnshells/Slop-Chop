import { useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { formatCompact, formatCount, formatDay } from "../lib/format";
import { chartablePosters, type Poster } from "../lib/posters";

type Metric = "lifetimePosts" | "followers";

const TOP_COUNT = 8;

function logT(value: number, max: number): number {
  const safe = Math.max(0, value);
  const top = Math.max(1, max);
  return Math.log10(safe + 1) / Math.log10(top + 1);
}

function plotPct(value: number, max: number): number {
  return 6 + logT(value, max) * 88;
}

function ticks(max: number): number[] {
  const values = [0, 10, 100, 1_000, 10_000, 100_000, 1_000_000];
  return values.filter((value) => value <= max * 1.05);
}

function blockLabel(poster: Poster): string {
  if (poster.blockState === "blocked" && poster.blockedOn) {
    return `blocked ${formatDay(poster.blockedOn)}`;
  }
  if (poster.blockState === "not_blocked") return "open";
  return "date unknown";
}

export function StateTag({ poster }: { poster: Poster }) {
  if (poster.blockState === "blocked") return <span className="tag tag-teal">Blocked</span>;
  if (poster.blockState === "not_blocked") return <span className="tag tag-coral">Open</span>;
  return <span className="tag">Unknown</span>;
}

function EmptyCounts() {
  return (
    <div className="empty">
      <p>No public post or follower counts to chart yet.</p>
    </div>
  );
}

export function TopPosters({
  posters,
  selected,
  onSelect,
}: {
  posters: Poster[];
  selected: string | null;
  onSelect: (handle: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("followers");
  const points = useMemo(() => chartablePosters(posters), [posters]);
  const ranked = useMemo(
    () =>
      points
        .slice()
        .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0) || a.handle.localeCompare(b.handle))
        .slice(0, TOP_COUNT),
    [metric, points],
  );
  const maxRank = ranked[0]?.[metric] ?? 1;

  if (points.length === 0) return <EmptyCounts />;

  return (
    <div className="top-posters">
      <div className="segmented" role="group" aria-label="Ranking metric">
        <button type="button" aria-pressed={metric === "followers"} onClick={() => setMetric("followers")}>
          Followers
        </button>
        <button
          type="button"
          aria-pressed={metric === "lifetimePosts"}
          onClick={() => setMetric("lifetimePosts")}
        >
          Posts
        </button>
      </div>
      <ol
        className="rank-chart"
        aria-label={metric === "lifetimePosts" ? "Top posters by lifetime posts" : "Top posters by followers"}
      >
        {ranked.map((poster, index) => {
          const value = poster[metric] ?? 0;
          const pressed = selected?.toLowerCase() === poster.handle.toLowerCase();
          return (
            <li key={poster.id}>
              <button
                type="button"
                className="rank-row"
                aria-pressed={pressed}
                onClick={() => onSelect(poster.handle)}
              >
                <span className="rank-n">{index + 1}</span>
                <Avatar handle={poster.handle} displayName={poster.displayName} size={30} decorative />
                <span className="rank-meta">
                  <span className="rank-name">@{poster.handle}</span>
                  <span className="rank-track" aria-hidden="true">
                    <span style={{ width: `${Math.max(4, (value / maxRank) * 100)}%` }} />
                  </span>
                </span>
                <span className="rank-value">{formatCompact(value)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ReachChart({
  posters,
  selected,
  onSelect,
}: {
  posters: Poster[];
  selected: string | null;
  onSelect: (handle: string) => void;
}) {
  const points = useMemo(() => chartablePosters(posters), [posters]);
  const byFollowers = useMemo(
    () => points.slice().sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)),
    [points],
  );

  if (points.length === 0) return <EmptyCounts />;

  const maxPosts = Math.max(...points.map((poster) => poster.lifetimePosts ?? 0), 1);
  const maxFollowers = Math.max(...points.map((poster) => poster.followers ?? 0), 1);
  const selectedPoster =
    posters.find((poster) => poster.handle.toLowerCase() === selected?.toLowerCase()) ??
    byFollowers[0] ??
    null;

  return (
    <div className="scatter-layout">
      <div
        className="scatter-plot"
        role="img"
        aria-label="Scatter of lifetime posts versus followers for posters with public profile counts. Marker size is followers. Color marks blocked versus still open."
      >
        <span className="scatter-y" aria-hidden="true">
          Posts
        </span>
        <div className="scatter-canvas">
          <div className="scatter-grid" aria-hidden="true">
            {ticks(maxPosts).map((tick) => (
              <span key={`y-${tick}`} className="grid-y" style={{ bottom: `${plotPct(tick, maxPosts)}%` }}>
                {formatCompact(tick)}
              </span>
            ))}
            {ticks(maxFollowers).map((tick) => (
              <span
                key={`x-${tick}`}
                className="grid-x"
                style={{ left: `${plotPct(tick, maxFollowers)}%` }}
              >
                {formatCompact(tick)}
              </span>
            ))}
          </div>
          {points.map((poster) => {
            const left = plotPct(poster.followers ?? 0, maxFollowers);
            const bottom = plotPct(poster.lifetimePosts ?? 0, maxPosts);
            const size = 22 + logT(poster.followers ?? 0, maxFollowers) * 18;
            const pressed = selectedPoster?.id === poster.id;
            return (
              <button
                key={poster.id}
                type="button"
                className={`scatter-dot ${poster.blockState === "blocked" ? "blocked" : "open"}`}
                style={{ left: `${left}%`, bottom: `${bottom}%`, width: size, height: size }}
                aria-pressed={pressed}
                aria-label={`@${poster.handle}, ${formatCount(poster.lifetimePosts ?? 0)} posts, ${formatCount(poster.followers ?? 0)} followers, ${blockLabel(poster)}`}
                title={`@${poster.handle}`}
                onClick={() => onSelect(poster.handle)}
              >
                <Avatar
                  handle={poster.handle}
                  displayName={poster.displayName}
                  size={Math.round(size)}
                  decorative
                />
              </button>
            );
          })}
        </div>
        <span className="scatter-x" aria-hidden="true">
          Followers
        </span>
      </div>
      {selectedPoster ? <PosterCard poster={selectedPoster} /> : null}
    </div>
  );
}

function PosterCard({ poster }: { poster: Poster }) {
  return (
    <article className="poster-card" id="spotlight" aria-label={`Selected poster @${poster.handle}`}>
      <div className="poster-card-head">
        <Avatar handle={poster.handle} displayName={poster.displayName} size={64} />
        <div>
          <p className="poster-card-name">{poster.displayName ?? `@${poster.handle}`}</p>
          <a href={`https://x.com/${poster.handle}`} rel="noreferrer">
            @{poster.handle}
          </a>
        </div>
      </div>
      <dl className="card-facts">
        <div>
          <dt>Posts</dt>
          <dd>{poster.lifetimePosts == null ? "—" : formatCompact(poster.lifetimePosts)}</dd>
        </div>
        <div>
          <dt>Followers</dt>
          <dd>{poster.followers == null ? "—" : formatCompact(poster.followers)}</dd>
        </div>
        <div>
          <dt>Following</dt>
          <dd>{poster.following == null ? "—" : formatCompact(poster.following)}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{poster.createdOn ? poster.createdOn.slice(0, 4) : "—"}</dd>
        </div>
      </dl>
      <p className="card-state">
        <StateTag poster={poster} />
        <span className="dim">{blockLabel(poster)}</span>
      </p>
    </article>
  );
}

