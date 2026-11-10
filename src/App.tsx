import { useMemo, useState } from "react";
import rawDefault from "../data/dataset.json";
import { aggregate } from "./lib/aggregates";
import { collectPosters } from "./lib/posters";
import { formatAsOf, formatCount, formatDay, formatSlot, sourceLabel } from "./lib/format";
import type { Dataset, Snapshot } from "./lib/types";
import { validateDataset } from "./schema/validate";
import { DailyChart } from "./components/DailyChart";
import { DayTimeline } from "./components/DayTimeline";
import { Explorer } from "./components/Explorer";
import { PosterChart } from "./components/PosterChart";
import { PosterWall } from "./components/PosterWall";
import { Snapshots } from "./components/Snapshots";

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
  const selectedDay = totals.days.find((day) => day.date === selected) ?? null;
  const xSnapshot = latestNumbered(dataset.snapshots, "x_blocks_total");
  const listSnapshot = latestNumbered(dataset.snapshots, "list_size");
  const partialDay = totals.days.find((day) => day.status === "partial");

  function download() {
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dataset.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function focusPoster(handle: string) {
    setFocusHandle(handle);
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
            <span>
              <span className="brand-name">Slop-Chop</span>
              <span className="brand-sub">AI slop posters</span>
            </span>
          </a>
          <nav aria-label="Sections">
            <a href="#posters">Posters</a>
            <a href="#when">When</a>
            <a href="#top">Top</a>
            <a href="#explorer">Explorer</a>
            <a href="#notes">Notes</a>
          </nav>
        </div>
      </header>
      <main id="content" className="shell">
        <section className="hero" id="posters" aria-labelledby="page-title">
          <div className="hero-count">
            <p className="kicker">Recorded blocks</p>
            <h1 id="page-title">
              <span className="value">{formatCount(totals.completeNewBlocks)}</span>
              <span className="hero-label">AI slop posters</span>
            </h1>
            {partialDay ? (
              <p className="stamp">
                {formatDay(partialDay.date)} floor
              </p>
            ) : null}
          </div>
          <PosterWall posters={posters} selected={focusHandle} onSelect={focusPoster} />
        </section>

        <section className="metrics" aria-label="Counts">
          <article aria-label="Monitor newly blocked, complete days">
            <p className="kicker">Blocked</p>
            <p className="value">{formatCount(totals.completeNewBlocks)}</p>
            <p className="detail">
              {totals.lastCompleteDate ? formatDay(totals.lastCompleteDate, "long") : "—"}
            </p>
          </article>
          <article className="partial" aria-label="Partial monitor blocks">
            <p className="kicker">Partial floor</p>
            <p className="value">{formatCount(totals.partialNewBlocks)}</p>
            <p className="detail">
              {partialDay
                ? `${formatDay(partialDay.date, "long")}. Recorded floor, not a full count.`
                : "None"}
            </p>
          </article>
          <article aria-label="X blocks at latest timestamp">
            <p className="kicker">X block list</p>
            <p className="value">
              {xSnapshot && typeof xSnapshot.x_blocks_total === "number"
                ? formatCount(xSnapshot.x_blocks_total)
                : "—"}
            </p>
            <p className="detail">{xSnapshot ? formatAsOf(xSnapshot.as_of) : "—"}</p>
          </article>
          <article aria-label="Curated list size at a timestamp">
            <p className="kicker">On the list</p>
            <p className="value">
              {listSnapshot && typeof listSnapshot.list_size === "number"
                ? formatCount(listSnapshot.list_size)
                : "—"}
            </p>
            <p className="detail">
              {listSnapshot ? `${sourceLabel(listSnapshot.source)}. ` : ""}
              {listSnapshot && typeof listSnapshot.list_members_unblocked === "number"
                ? `${formatCount(listSnapshot.list_members_unblocked)} still open`
                : "—"}
            </p>
          </article>
        </section>

        <section id="when" aria-labelledby="when-heading">
          <h2 id="when-heading">When</h2>
          <DailyChart
            days={totals.days}
            mode={mode}
            onMode={setMode}
            selected={selected}
            onSelect={setSelected}
          />
          {selectedDay ? (
            <section className="drill" aria-label={`${formatDay(selectedDay.date, "long")} detail`}>
              <h3>{formatDay(selectedDay.date, "long")}</h3>
              <p className="mono">
                {formatCount(selectedDay.newBlocks)}
                {selectedDay.status === "partial" ? " · partial floor, not a full day" : ""}
                {" · "}
                {formatCount(selectedDay.cumulativeRecorded)} total
              </p>
            </section>
          ) : null}
          <details className="fold">
            <summary>Daily runs</summary>
            <DayTimeline
              dataset={dataset}
              days={totals.days}
              selected={selected}
              onSelect={setSelected}
            />
          </details>
        </section>

        <section id="top" aria-labelledby="top-heading">
          <h2 id="top-heading">Top posters</h2>
          <PosterChart posters={posters} selected={focusHandle} onSelect={focusPoster} />
        </section>

        <section id="explorer" aria-labelledby="explorer-heading">
          <h2 id="explorer-heading">Account explorer</h2>
          <Explorer posters={posters} selected={focusHandle} onSelect={setFocusHandle} />
        </section>

        <section id="notes" aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="sr-only">
            Notes
          </h2>
          <section id="snapshots" aria-labelledby="snapshots-heading">
            <details className="fold" open>
              <summary>
                <h2 id="snapshots-heading">Snapshots and pending work</h2>
              </summary>
              <Snapshots dataset={dataset} />
            </details>
          </section>
          <section id="method" aria-labelledby="method-heading">
            <details className="fold">
              <summary>
                <h2 id="method-heading">Methodology</h2>
              </summary>
              <ul className="method">
                <li>Daily totals sum recorded monitor events, not diffs of the full X block list.</li>
                <li>An event counts once. The same id replaces a row; it does not double-count.</li>
                <li>Superseded rows stay visible and are left out of totals.</li>
                <li>Open-work remaining counts are not added on top of the related event.</li>
                <li>Snapshots are point-in-time. Two snapshots are not a reconciliation.</li>
                <li>{dataset.monitoring.preexisting_note}</li>
                <li>
                  {dataset.events.filter((event) => event.status === "superseded").length === 0
                    ? "No monitor row is superseded."
                    : `Superseded rows stay in the timeline and are left out of the totals: ${dataset.events
                        .filter((event) => event.status === "superseded")
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
        </section>
      </main>
      <footer className="footer">
        <div className="shell footer-inner">
          <p>
            {formatCount(totals.completeNewBlocks)} blocked · {formatCount(posters.length)} named ·
            schema {dataset.schema_version}
          </p>
          <button type="button" onClick={download}>
            Download dataset.json
          </button>
        </div>
      </footer>
    </>
  );
}
