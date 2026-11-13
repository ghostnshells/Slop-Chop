import { useMemo, useState } from "react";
import rawDefault from "../data/dataset.json";
import { aggregate } from "./lib/aggregates";
import { collectPosters } from "./lib/posters";
import { formatAsOf, formatCount, formatDay, formatSlot } from "./lib/format";
import type { Dataset, Snapshot } from "./lib/types";
import { validateDataset } from "./schema/validate";
import { DailyChart } from "./components/DailyChart";
import { Explorer } from "./components/Explorer";
import { ReachChart, TopPosters } from "./components/PosterChart";
import { PosterWall } from "./components/PosterWall";

type SeriesMode = "new" | "cumulative";

function latestNumbered(snapshots: Snapshot[], field: "list_size" | "x_blocks_total"): Snapshot | null {
  return (
    snapshots
      .filter((snapshot) => typeof snapshot[field] === "number")
      .sort((a, b) => a.as_of.localeCompare(b.as_of))
      .at(-1) ?? null
  );
}

export function App({ raw = rawDefault }: { raw?: unknown }) {
  const parsed = useMemo(() => validateDataset(raw), [raw]);
  if (!parsed.ok || !parsed.value) {
    return (
      <main className="shell" id="content">
        <h1>Dataset failed validation</h1>
        <ul>
          {parsed.errors.map((error) => (
            <li key={`${error.path}:${error.message}`}>
              <code>{error.path}</code> {error.message}
            </li>
          ))}
        </ul>
      </main>
    );
  }
  return <Gallery dataset={parsed.value} raw={raw} />;
}

function Gallery({ dataset, raw }: { dataset: Dataset; raw: unknown }) {
  const totals = useMemo(() => aggregate(dataset), [dataset]);
  const posters = useMemo(() => collectPosters(dataset), [dataset]);
  const [mode, setMode] = useState<SeriesMode>("new");
  const [selected, setSelected] = useState<string | null>(totals.days.at(-1)?.date ?? null);
  const [focusHandle, setFocusHandle] = useState<string | null>(null);
  const xSnapshot = latestNumbered(dataset.snapshots, "x_blocks_total");
  const listSnapshot = latestNumbered(dataset.snapshots, "list_size");
  const partialDay = totals.days.find((day) => day.status === "partial");
  const profiled = posters.filter((poster) => poster.followers != null || poster.lifetimePosts != null);
  const superseded = dataset.events.filter((event) => event.status === "superseded");

  function download() {
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dataset.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function spotlight(handle: string) {
    setFocusHandle(handle);
    document.getElementById("spotlight")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="header">
        <div className="shell header-inner">
          <a className="brand" href="#posters">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect x="4" y="16" width="6" height="12" fill="currentColor" />
              <rect x="13" y="8" width="6" height="20" fill="#8fd9cf" />
              <path d="M3 6 L29 18" stroke="#f3ecdf" strokeWidth="2" />
            </svg>
            <span className="brand-name">Slop-Chop</span>
          </a>
          <nav aria-label="Sections">
            <a href="#posters">Posters</a>
            <a href="#activity">Activity</a>
            <a href="#reach">Reach</a>
            <a href="#explorer">Explorer</a>
            <a href="#method">Method</a>
          </nav>
        </div>
      </header>

      <main id="content" className="shell">
        <section className="hero" id="posters" aria-labelledby="page-title">
          <div className="hero-head">
            <p className="kicker">Community-curated block list</p>
            <h1 id="page-title">
              <span className="hero-value">{formatCount(totals.completeNewBlocks)}</span>
              <span className="hero-label">AI slop posters blocked</span>
            </h1>
            <p className="hero-sub">
              {totals.lastCompleteDate
                ? `Complete through ${formatDay(totals.lastCompleteDate, "long")}`
                : "No complete days yet"}
              {partialDay ? (
                <>
                  {" · "}
                  <span className="tag tag-coral">
                    {formatDay(partialDay.date)} partial +{formatCount(totals.partialNewBlocks)}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="stats" aria-label="Counts" role="group">
            <article className="stat" aria-label="Monitor newly blocked, complete days">
              <p className="stat-label">Blocked</p>
              <p className="stat-value">{formatCount(totals.completeNewBlocks)}</p>
              <p className="stat-detail">{totals.days.length} days monitored</p>
            </article>
            <article className="stat" aria-label="Named posters">
              <p className="stat-label">Named</p>
              <p className="stat-value">{formatCount(posters.length)}</p>
              <p className="stat-detail">{formatCount(profiled.length)} with profile counts</p>
            </article>
            <article className="stat" aria-label="X blocks at latest timestamp">
              <p className="stat-label">X block list</p>
              <p className="stat-value">
                {xSnapshot && typeof xSnapshot.x_blocks_total === "number"
                  ? formatCount(xSnapshot.x_blocks_total)
                  : "—"}
              </p>
              <p className="stat-detail">{xSnapshot ? formatAsOf(xSnapshot.as_of) : "—"}</p>
            </article>
            <article className="stat" aria-label="Curated list size at a timestamp">
              <p className="stat-label">On the list</p>
              <p className="stat-value">
                {listSnapshot && typeof listSnapshot.list_size === "number"
                  ? formatCount(listSnapshot.list_size)
                  : "—"}
              </p>
              <p className="stat-detail">
                {listSnapshot && typeof listSnapshot.list_members_unblocked === "number"
                  ? `${formatCount(listSnapshot.list_members_unblocked)} not yet blocked`
                  : "—"}
              </p>
            </article>
          </div>

          <PosterWall posters={posters} selected={focusHandle} onSelect={spotlight} />
        </section>

        <div className="split" id="activity">
          <section className="panel" aria-labelledby="when-heading">
            <div className="panel-head">
              <h2 id="when-heading">Blocks per day</h2>
            </div>
            <DailyChart
              days={totals.days}
              mode={mode}
              onMode={setMode}
              selected={selected}
              onSelect={setSelected}
            />
          </section>

          <section className="panel" aria-labelledby="top-heading">
            <div className="panel-head">
              <h2 id="top-heading">Top posters</h2>
            </div>
            <TopPosters posters={posters} selected={focusHandle} onSelect={spotlight} />
          </section>
        </div>

        <section className="panel" id="reach" aria-labelledby="reach-heading">
          <div className="panel-head">
            <h2 id="reach-heading">Reach vs posts</h2>
            <p className="panel-note">Public profile counters, log scale</p>
          </div>
          <ReachChart posters={posters} selected={focusHandle} onSelect={setFocusHandle} />
        </section>

        <section className="panel" id="explorer" aria-labelledby="explorer-heading">
          <div className="panel-head">
            <h2 id="explorer-heading">Account explorer</h2>
          </div>
          <Explorer posters={posters} selected={focusHandle} onSelect={setFocusHandle} />
        </section>

        <section id="method" aria-labelledby="method-heading">
          <details className="fold">
            <summary>
              <h2 id="method-heading">Methodology</h2>
            </summary>
            <ul className="method">
              <li>Daily totals sum recorded monitor events, not diffs of the full X block list.</li>
              <li>An event counts once. The same id replaces a row; it does not double-count.</li>
              <li>{dataset.monitoring.preexisting_note}</li>
              <li>
                {superseded.length === 0
                  ? "No monitor row is superseded."
                  : `Superseded rows are left out of the totals: ${superseded
                      .map(
                        (event) =>
                          `${formatDay(event.date)} ${formatSlot(event.slot)} (${formatCount(event.new_blocks)})`,
                      )
                      .join(", ")}.`}
              </li>
              <li>
                Curated list membership is a community assessment, not independent evidence that an
                account is an AI slop poster.
              </li>
              <li>
                Lifetime posts and followers are public profile counters. They are not measured AI
                slop volume.
              </li>
              <li>
                Named faces come from run journals. Missing handle lists mean the journal recorded a
                count only.
              </li>
              <li>
                Dates use {dataset.monitoring.timezone}. This page does not call X and does not
                scrape.
              </li>
            </ul>
            <p className="dim">
              Dataset updated <time dateTime={dataset.updated_at}>{formatAsOf(dataset.updated_at)}</time>
              . {dataset.provenance.summary}
            </p>
          </details>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-inner">
          <p>
            {formatCount(totals.completeNewBlocks)} blocked · {formatCount(posters.length)} named ·
            schema {dataset.schema_version}
          </p>
          <button type="button" className="btn" onClick={download}>
            Download dataset.json
          </button>
        </div>
      </footer>
    </>
  );
}
