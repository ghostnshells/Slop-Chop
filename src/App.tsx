import { useMemo, useState } from "react";
import rawDefault from "../data/dataset.json";
import { aggregate } from "./lib/aggregates";
import { formatAsOf, formatCount, formatDay, formatSlot } from "./lib/format";
import type { Dataset, Snapshot } from "./lib/types";
import { validateDataset } from "./schema/validate";
import { DailyChart } from "./components/DailyChart";
import { DayTimeline } from "./components/DayTimeline";
import { Explorer } from "./components/Explorer";
import { Rankings } from "./components/Rankings";
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
  return <Monitor dataset={parsed.value} raw={raw} />;
}

function Monitor({ dataset, raw }: { dataset: Dataset; raw: unknown }) {
  const totals = useMemo(() => aggregate(dataset), [dataset]);
  const [mode, setMode] = useState<SeriesMode>("new");
  const [selected, setSelected] = useState<string | null>(totals.days.at(-1)?.date ?? null);
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

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="header">
        <div className="shell header-inner">
          <a className="brand" href="#overview">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect x="4" y="16" width="6" height="12" fill="currentColor" />
              <rect x="13" y="8" width="6" height="20" fill="#8fd9cf" />
              <path d="M3 6 L29 18" stroke="#f3ecdf" strokeWidth="2" />
            </svg>
            <span>
              <span className="brand-name">Slop-Chop</span>
              <span className="brand-sub">AI slop poster block monitor</span>
            </span>
          </a>
          <nav aria-label="Sections">
            <a href="#overview">Overview</a>
            <a href="#timeline">Timeline</a>
            <a href="#snapshots">Snapshots</a>
            <a href="#explorer">Accounts</a>
            <a href="#rankings">Activity</a>
            <a href="#method">Methodology</a>
          </nav>
        </div>
      </header>
      <main id="content" className="shell">
        <section className="masthead" aria-labelledby="page-title">
          <div>
            <p className="kicker">Umar’s list · @{dataset.subject.handle}</p>
            <h1 id="page-title">Recorded blocks against a community list of AI slop posters</h1>
            <p className="lede">
              {dataset.list.description} Monitoring started{" "}
              {formatDay(dataset.monitoring.started_on, "long")}. The chart counts newly blocked
              accounts recorded by the monitor. It is not the full block list on X, and it is not
              a live feed.
            </p>
          </div>
          {partialDay ? (
            <p className="stamp">
              {formatDay(partialDay.date)} partial
            </p>
          ) : null}
        </section>

        <section id="overview" aria-labelledby="overview-heading">
          <h2 id="overview-heading">Overview</h2>
          <p className="reading">
            Monitor, complete through{" "}
            {totals.lastCompleteDate ? formatDay(totals.lastCompleteDate, "long") : "—"}:{" "}
            <strong>{formatCount(totals.completeNewBlocks)}</strong> newly blocked.
            {partialDay ? (
              <>
                {" "}
                {formatDay(partialDay.date, "long")} is partial:{" "}
                <strong>{formatCount(partialDay.partialNewBlocks)}</strong> verified, and the day
                is not finished.
              </>
            ) : null}{" "}
            {xSnapshot && typeof xSnapshot.x_blocks_total === "number" ? (
              <>
                Full X block list at {formatAsOf(xSnapshot.as_of)}:{" "}
                <strong>{formatCount(xSnapshot.x_blocks_total)}</strong>.
              </>
            ) : null}{" "}
            These are different measurements taken at different times.
          </p>
          <div className="metrics">
            <article aria-label="Monitor newly blocked, complete days">
              <p className="kicker">Monitor newly blocked</p>
              <p className="value">{formatCount(totals.completeNewBlocks)}</p>
              <p className="detail">
                Complete days
                {totals.lastCompleteDate
                  ? ` through ${formatDay(totals.lastCompleteDate, "long")}`
                  : ""}
                . Excludes {formatCount(totals.preexistingBlockedExcluded)} preexisting blocks.
              </p>
            </article>
            <article className="partial" aria-label="Partial monitor blocks">
              <p className="kicker">Partial, not a finished day</p>
              <p className="value">{formatCount(totals.partialNewBlocks)}</p>
              <p className="detail">
                {partialDay
                  ? `${formatDay(partialDay.date, "long")} verified so far. Remaining approved accounts are listed under snapshots and are not added here.`
                  : "No partial monitor events."}
              </p>
            </article>
            <article aria-label="X blocks at latest timestamp">
              <p className="kicker">X blocks at a timestamp</p>
              <p className="value">
                {xSnapshot && typeof xSnapshot.x_blocks_total === "number"
                  ? formatCount(xSnapshot.x_blocks_total)
                  : "—"}
              </p>
              <p className="detail">
                {xSnapshot
                  ? `${formatAsOf(xSnapshot.as_of)}. Full block list on X, not the monitor sum.`
                  : "No X block snapshot."}
              </p>
            </article>
            <article aria-label="Curated list size at a timestamp">
              <p className="kicker">Curated list at a timestamp</p>
              <p className="value">
                {listSnapshot && typeof listSnapshot.list_size === "number"
                  ? formatCount(listSnapshot.list_size)
                  : "—"}
              </p>
              <p className="detail">
                {listSnapshot && typeof listSnapshot.list_size === "number"
                  ? `${formatAsOf(listSnapshot.as_of)}. ${
                      typeof listSnapshot.list_members_blocked === "number"
                        ? `${formatCount(listSnapshot.list_members_blocked)} blocked on the list`
                        : "Blocked-on-list not recorded"
                    }, ${
                      typeof listSnapshot.list_members_unblocked === "number"
                        ? `${formatCount(listSnapshot.list_members_unblocked)} not blocked`
                        : "unblocked count not recorded"
                    }.`
                  : "No list-size snapshot."}
              </p>
            </article>
          </div>
        </section>

        <section id="timeline" aria-labelledby="timeline-heading">
          <h2 id="timeline-heading">Daily timeline</h2>
          <p>
            Each bar sums monitor events for that calendar day. Striped bars are partial. Zoom and
            pan change the window only. Select a day to read the runs, their timestamps, and
            provenance.
          </p>
          <DailyChart
            days={totals.days}
            mode={mode}
            onMode={setMode}
            selected={selected}
            onSelect={setSelected}
          />
          <p className="caption">
            Cumulative through the last complete day
            {totals.lastCompleteDate ? ` (${formatDay(totals.lastCompleteDate)})` : ""}:{" "}
            {formatCount(totals.completeNewBlocks)}. Cumulative including partial records:{" "}
            {formatCount(totals.recordedNewBlocks)}.
          </p>
          {selectedDay ? (
            <section className="drill" aria-label={`${formatDay(selectedDay.date, "long")} detail`}>
              <h3>{formatDay(selectedDay.date, "long")}</h3>
              <p>
                {formatCount(selectedDay.newBlocks)} newly blocked
                {selectedDay.status === "partial"
                  ? ", and this day is incomplete"
                  : " on a complete day"}
                . Running recorded total after this day:{" "}
                {formatCount(selectedDay.cumulativeRecorded)}. Complete-only running total:{" "}
                {formatCount(selectedDay.cumulativeComplete)}.
              </p>
            </section>
          ) : (
            <p className="note">Select a day to inspect that day’s runs.</p>
          )}
          <h3>Historical daily timeline</h3>
          <DayTimeline
            dataset={dataset}
            days={totals.days}
            selected={selected}
            onSelect={setSelected}
          />
        </section>

        <section id="snapshots" aria-labelledby="snapshots-heading">
          <h2 id="snapshots-heading">Snapshots and pending work</h2>
          <p>
            Every figure below is tied to a timestamp. A later snapshot does not erase an earlier
            one, and none of them are added to the monitor’s newly blocked total. Where an X block
            timestamp does not match the monitor sum, the snapshot note records the gap. That
            arithmetic is not a reconciliation.
          </p>
          <Snapshots dataset={dataset} />
        </section>

        <section id="explorer" aria-labelledby="explorer-heading">
          <h2 id="explorer-heading">Account explorer</h2>
          <p>
            Search and filters read imported account records only. {dataset.accounts.length}{" "}
            accounts are in this dataset.
          </p>
          <Explorer accounts={dataset.accounts} />
        </section>

        <section id="rankings" aria-labelledby="rankings-heading">
          <h2 id="rankings-heading">Public profile activity</h2>
          <p>
            When profile snapshots exist, this ranks public follower counts and lifetime posts.
            High activity is not evidence about the curated list, and it is not a volume of AI slop.
          </p>
          <Rankings accounts={dataset.accounts} />
        </section>

        <section id="method" aria-labelledby="method-heading">
          <h2 id="method-heading">Methodology</h2>
          <ul className="method">
            <li>
              Daily totals sum recorded monitor events. They are not computed by diffing the full
              X block list.
            </li>
            <li>
              An event counts once. Stable ids are upserted on import, so submitting the same log
              again does not add the same blocks twice. A corrected event with the same id
              replaces the previous count.
            </li>
            <li>
              Events marked superseded stay visible and are left out of totals.
            </li>
            <li>
              Open-work records describe unfinished batches. Approved and remaining counts are not
              added on top of the related event.
            </li>
            <li>
              Snapshots are point-in-time observations of list size and the full X block list.
              Two snapshots are not a reconciliation.
            </li>
            <li>
              {dataset.monitoring.preexisting_note}
            </li>
            <li>
              {dataset.events.filter((event) => event.status === "superseded").length === 0
                ? "No monitor row is superseded."
                : `Superseded rows stay in the timeline and are left out of totals: ${dataset.events
                    .filter((event) => event.status === "superseded")
                    .map((event) => `${formatDay(event.date)} ${formatSlot(event.slot)} (${formatCount(event.new_blocks)})`)
                    .join(", ")}.`}
            </li>
            <li>
              Curated list membership is a community assessment, not independent evidence that an
              account is an AI slop poster.
            </li>
            <li>
              When profile rows are present, lifetime posts, followers, and following are public
              profile counters. They are not measured AI slop volume.
            </li>
            <li>
              Named handles on small runs were carried from the routine journal. A missing handle
              list means the journal recorded a count only. The numeric new-block field is
              authoritative.
            </li>
            <li>
              Dates and slots use {dataset.monitoring.timezone}. This page does not call X, does
              not hold API keys, and does not scrape.
            </li>
          </ul>
          <h3>How a nightly update lands</h3>
          <p>
            Write <code>data/inbox/&lt;export_id&gt;.json</code> matching schema{" "}
            <code>data/schema/v1.schema.json</code> (contract version {dataset.schema_version}).
            Run <code>npm run ingest</code>. The UI reads <code>data/dataset.json</code> and does
            not need a code change. Open a pull request. Do not merge it until the numbers have
            been reviewed. The scheduled workflow validates files already in the repo only when
            the <code>DATA_REFRESH_SOURCE</code> repository variable is <code>inbox</code>. It
            never polls an API.
          </p>
          <p className="dim">
            Dataset updated <time dateTime={dataset.updated_at}>{formatAsOf(dataset.updated_at)}</time>
            . Compiler {dataset.compiler.name} {dataset.compiler.version}. {dataset.provenance.summary}
          </p>
        </section>
      </main>
      <footer className="footer">
        <div className="shell footer-inner">
          <p>
            Slop-Chop · schema {dataset.schema_version} · {dataset.events.length} events ·{" "}
            {dataset.snapshots.length} snapshots · {dataset.accounts.length} accounts
          </p>
          <button type="button" onClick={download}>
            Download dataset.json
          </button>
        </div>
      </footer>
    </>
  );
}
