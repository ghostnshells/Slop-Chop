import { useMemo, useState } from "react";
import rawHistory from "../../data/clankwall/history.json";
import rawSnapshot from "../../data/clankwall/current.json";
import {
  CLANKWALL_DISPUTE,
  CLANKWALL_OWNER,
  CLANKWALL_URL,
  clankwallBlockCoverage,
  distributionBuckets,
  matchLabel,
  namedBlockedHandles,
  normalizeClankwall,
  recordMatch,
  summarize,
  type ClankwallAccount,
} from "../lib/clankwall";
import type { Dataset } from "../lib/types";
import { formatAsOf, formatCount } from "../lib/format";

type FlagFilter = "ai" | "spam" | "all";
type SortKey = "ai_flags" | "spam_flags" | "sampled" | "username";

export function ClankwallPanel({ dataset }: { dataset: Dataset }) {
  const parsed = useMemo(() => normalizeClankwall(rawSnapshot, rawSnapshot.imported_at), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FlagFilter>("ai");
  const [sortKey, setSortKey] = useState<SortKey>("ai_flags");
  const [visible, setVisible] = useState(25);

  if (!parsed.ok) {
    return (
      <div className="empty">
        <h3>Clankwall snapshot failed validation</h3>
        <ul>
          {parsed.errors.slice(0, 8).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  const snapshot = parsed.value;
  const summary = summarize(snapshot.accounts);
  const buckets = distributionBuckets(summary);
  const maxBucket = Math.max(...buckets.map((bucket) => bucket.accounts), 1);
  const coverage = clankwallBlockCoverage(dataset);
  const blocked = namedBlockedHandles(dataset);
  const needle = query.trim().toLowerCase().replace(/^@/, "");
  const rows = snapshot.accounts
    .filter((account) => {
      if (filter === "ai" && account.ai_flags <= 0) return false;
      if (filter === "spam" && account.ai_flags !== 0) return false;
      return !needle || account.username.toLowerCase().includes(needle);
    })
    .sort((a, b) => compareAccounts(a, b, sortKey));
  const shown = rows.slice(0, visible);
  const historyCount = rawHistory.entries?.length ?? 0;

  return (
    <div className="stack">
      <p>
        Data: <a href={CLANKWALL_URL}>Clankwall</a> by{" "}
        <a href={`https://x.com/${CLANKWALL_OWNER}`}>@{CLANKWALL_OWNER}</a>. Flags count sampled
        replies, not an account’s whole history. They are signals, not proof, and a spam flag is
        not an AI-slop label.
      </p>
      <p className="disclaimer">{snapshot.flag_rule}</p>
      <p className="dim">
        Source generated{" "}
        <time dateTime={snapshot.generated_at}>{formatAsOf(snapshot.generated_at)}</time>
        . Imported <time dateTime={snapshot.imported_at}>{formatAsOf(snapshot.imported_at)}</time>.
        Snapshot <span className="mono">{snapshot.snapshot}</span>.
      </p>
      <div className="metrics">
        <article aria-label="Clankwall flagged accounts">
          <p className="kicker">Flagged accounts</p>
          <p className="value">{formatCount(summary.total)}</p>
          <p className="detail">Everyone in this Clankwall snapshot.</p>
        </article>
        <article aria-label="Clankwall AI-flagged accounts">
          <p className="kicker">AI-flagged</p>
          <p className="value">{formatCount(summary.aiFlagged)}</p>
          <p className="detail">At least one sampled reply with an AI-style note.</p>
        </article>
        <article aria-label="Clankwall spam-only accounts">
          <p className="kicker">Spam-only</p>
          <p className="value">{formatCount(summary.spamOnly)}</p>
          <p className="detail">No AI flag. Not counted here as AI slop.</p>
        </article>
        <article aria-label="Our blocks of the Clankwall AI feed">
          <p className="kicker">Our blocks of that feed</p>
          <p className="value">
            {coverage ? `${formatCount(coverage.blocked)}/${formatCount(coverage.feedSize)}` : "—"}
          </p>
          <p className="detail">
            {coverage
              ? `${formatAsOf(coverage.asOf)}. Our block read, not Clankwall’s flag count. ${formatCount(coverage.notBlocked)} are not on the block list.`
              : "No Clankwall block read is in the monitor dataset yet."}
          </p>
        </article>
      </div>
      {coverage ? <p className="note">{coverage.notes}</p> : null}

      <h3>AI flag counts</h3>
      <p className="caption">
        How many AI-flagged accounts have each count of sampled replies scored above 0.60 with an
        AI-style note. 5 or more are grouped. {formatCount(summary.aiAtLeast.five)} accounts have
        at least 5.
      </p>
      <ul className="flag-dist" aria-label="AI flag count distribution">
        {buckets.map((bucket) => (
          <li key={bucket.label}>
            <span className="mono">{bucket.label}</span>
            <span className="rank-track" aria-hidden="true">
              <span style={{ width: `${Math.max(4, (bucket.accounts / maxBucket) * 100)}%` }} />
            </span>
            <span className="mono">{formatCount(bucket.accounts)}</span>
          </li>
        ))}
      </ul>

      <h3>Accounts in this snapshot</h3>
      <form className="filters" role="search" aria-label="Filter Clankwall accounts">
        <label>
          Search username
          <input
            type="search"
            value={query}
            placeholder="name without @"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(25);
            }}
          />
        </label>
        <label>
          Flags
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as FlagFilter);
              setVisible(25);
            }}
          >
            <option value="ai">AI-flagged</option>
            <option value="spam">Spam-only</option>
            <option value="all">All flagged</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="ai_flags">AI flags</option>
            <option value="spam_flags">Spam flags</option>
            <option value="sampled">Sampled replies</option>
            <option value="username">Username</option>
          </select>
        </label>
      </form>
      <p className="caption">
        Showing {formatCount(shown.length)} of {formatCount(rows.length)}. A missing row in our
        block records is not treated as unblocked. Dispute a flag at{" "}
        <a href={`mailto:${CLANKWALL_DISPUTE}`}>{CLANKWALL_DISPUTE}</a>.
      </p>
      <div className="table-wrap">
        <table>
          <caption>Clankwall sampled reply flags. Not a measure of AI slop volume.</caption>
          <thead>
            <tr>
              <th scope="col">Username</th>
              <th scope="col">AI flags</th>
              <th scope="col">Spam flags</th>
              <th scope="col">Sampled</th>
              <th scope="col">AI peak</th>
              <th scope="col">Our records</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((account) => {
              const match = recordMatch(account.username, blocked);
              return (
                <tr key={account.id}>
                  <th scope="row">
                    <a href={`https://x.com/${account.username}`} rel="noreferrer">
                      @{account.username}
                    </a>
                  </th>
                  <td className="num">{formatCount(account.ai_flags)}</td>
                  <td className="num">{formatCount(account.spam_flags)}</td>
                  <td className="num">{formatCount(account.sampled)}</td>
                  <td className="num">{account.ai_peak === null ? "—" : account.ai_peak.toFixed(2)}</td>
                  <td>{matchLabel(match)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shown.length < rows.length ? (
        <button type="button" onClick={() => setVisible((count) => count + 25)}>
          Show more
        </button>
      ) : null}
      <p className="dim">
        {historyCount === 1
          ? "One committed snapshot. Another nightly import can show what changed. This page does not invent earlier days."
          : `${historyCount} committed snapshots. Totals below are only the snapshots we have imported.`}
      </p>
    </div>
  );
}

function compareAccounts(a: ClankwallAccount, b: ClankwallAccount, key: SortKey): number {
  if (key === "username") return a.username.localeCompare(b.username);
  const delta = b[key] - a[key];
  return delta || a.username.localeCompare(b.username);
}
