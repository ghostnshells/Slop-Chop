import { useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { formatCompact, formatCount, formatDay } from "../lib/format";
import { chartablePosters, type Poster } from "../lib/posters";

type ChartMode = "scatter" | "rank";

function logT(value: number, max: number): number {
  const safe = Math.max(0, value);
  const top = Math.max(1, max);
  return Math.log10(safe + 1) / Math.log10(top + 1);
}

function plotPct(value: number, max: number): number {
  return 8 + logT(value, max) * 84;
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

export function PosterChart({
  posters,
  selected,
  onSelect,
}: {
  posters: Poster[];
  selected: string | null;
  onSelect: (handle: string) => void;
}) {
  const [mode, setMode] = useState<ChartMode>("scatter");
  const [metric, setMetric] = useState<"lifetimePosts" | "followers">("lifetimePosts");
  const points = useMemo(() => chartablePosters(posters), [posters]);
  const ranked = useMemo(() => {
    const key = metric === "lifetimePosts" ? "lifetimePosts" : "followers";
    return points
      .slice()
      .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0) || a.handle.localeCompare(b.handle))
      .slice(0, 12);
  }, [metric, points]);

  const maxPosts = Math.max(...points.map((poster) => poster.lifetimePosts ?? 0), 1);
  const maxFollowers = Math.max(...points.map((poster) => poster.followers ?? 0), 1);
  const selectedPoster =
    posters.find((poster) => poster.handle.toLowerCase() === selected?.toLowerCase()) ??
    ranked[0] ??
    null;
  const maxRank = ranked[0]?.[metric] ?? 1;

  if (points.length === 0) {
    return (
      <div className="empty">
        <p>No public post or follower counts to chart yet.</p>
      </div>
    );
  }

  return (
    <div className="poster-chart">
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Poster chart type">
          <button type="button" aria-pressed={mode === "scatter"} onClick={() => setMode("scatter")}>
            Reach vs posts
          </button>
          <button type="button" aria-pressed={mode === "rank"} onClick={() => setMode("rank")}>
            Top posters
          </button>
        </div>
        {mode === "rank" ? (
          <div className="segmented" role="group" aria-label="Ranking metric">
            <button
              type="button"
              aria-pressed={metric === "lifetimePosts"}
              onClick={() => setMetric("lifetimePosts")}
            >
              Posts
            </button>
            <button
              type="button"
              aria-pressed={metric === "followers"}
              onClick={() => setMetric("followers")}
            >
              Followers
            </button>
          </div>
        ) : null}
      </div>

      {mode === "scatter" ? (
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
                <span
                  key={`y-${tick}`}
                  className="grid-y"
                  style={{ bottom: `${plotPct(tick, maxPosts)}%` }}
                >
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
              const size = 24 + logT(poster.followers ?? 0, maxFollowers) * 20;
              const pressed = selectedPoster?.id === poster.id;
              return (
                <button
                  key={poster.id}
                  type="button"
                  className={`scatter-dot ${poster.blockState === "blocked" ? "blocked" : "open"}`}
                  style={{ left: `${left}%`, bottom: `${bottom}%`, width: size, height: size }}
                  aria-pressed={pressed}
                  aria-label={`@${poster.handle}, ${formatCount(poster.lifetimePosts ?? 0)} posts, ${formatCount(poster.followers ?? 0)} followers, ${blockLabel(poster)}`}
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
      ) : (
        <ol className="rank-chart" aria-label={metric === "lifetimePosts" ? "Top posters by lifetime posts" : "Top posters by followers"}>
          {ranked.map((poster) => {
            const value = poster[metric] ?? 0;
            const pressed = selectedPoster?.id === poster.id;
            return (
              <li key={poster.id}>
                <button
                  type="button"
                  className="rank-row"
                  aria-pressed={pressed}
                  onClick={() => onSelect(poster.handle)}
                >
                  <Avatar handle={poster.handle} displayName={poster.displayName} size={36} decorative />
                  <span className="rank-meta">
                    <span className="rank-name">@{poster.handle}</span>
                    <span className="rank-sub">{blockLabel(poster)}</span>
                  </span>
                  <span className="rank-track" aria-hidden="true">
                    <span style={{ width: `${Math.max(6, (value / maxRank) * 100)}%` }} />
                  </span>
                  <span className="mono">{formatCompact(value)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function PosterCard({ poster }: { poster: Poster }) {
  return (
    <article className="poster-card" aria-label={`Selected poster @${poster.handle}`}>
      <Avatar handle={poster.handle} displayName={poster.displayName} size={72} />
      <div>
        <p className="poster-card-name">{poster.displayName ?? `@${poster.handle}`}</p>
        <p>
          <a href={`https://x.com/${poster.handle}`} rel="noreferrer">
            @{poster.handle}
          </a>
        </p>
        <dl className="facts compact">
          <div>
            <dt>Posts</dt>
            <dd>{poster.lifetimePosts == null ? "—" : formatCount(poster.lifetimePosts)}</dd>
          </div>
          <div>
            <dt>Followers</dt>
            <dd>{poster.followers == null ? "—" : formatCount(poster.followers)}</dd>
          </div>
          <div>
            <dt>Blocked</dt>
            <dd>{blockLabel(poster)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
