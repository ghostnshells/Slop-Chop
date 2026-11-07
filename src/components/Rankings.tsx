import { useState } from "react";
import { rankAccounts } from "../lib/accounts";
import type { Account } from "../lib/types";
import { formatCount } from "../lib/format";
import { ProfileDisclaimer } from "./ProfileDisclaimer";

export function Rankings({ accounts }: { accounts: Account[] }) {
  const [metric, setMetric] = useState<"lifetime_posts" | "followers">("lifetime_posts");
  const ranked = rankAccounts(accounts, metric, 10);
  const withMetric = accounts.filter((account) => typeof account.profile?.[metric] === "number");
  const max = ranked[0]?.value ?? 1;
  const metricLabel =
    metric === "lifetime_posts" ? "Public lifetime posts" : "Public followers";

  return (
    <div className="stack">
      <ProfileDisclaimer />
      <div className="segmented" role="group" aria-label="Ranking metric">
        <button
          type="button"
          aria-pressed={metric === "lifetime_posts"}
          onClick={() => setMetric("lifetime_posts")}
        >
          Lifetime posts
        </button>
        <button
          type="button"
          aria-pressed={metric === "followers"}
          onClick={() => setMetric("followers")}
        >
          Followers
        </button>
      </div>
      {withMetric.length === 0 ? (
        <div className="empty">
          <h3>No {metricLabel.toLowerCase()} to rank</h3>
          <p>
            Nothing in the dataset has this public profile counter yet. When account exports
            include it, this list ranks that counter only. It will still not be a measurement of
            AI slop volume, and list membership will still be a community assessment.
          </p>
        </div>
      ) : (
        <>
          <p className="caption">
            {metricLabel} among {withMetric.length} imported profiles that include this counter.
            Axis unit: accounts on the public profile, not posts observed on the curated list.
          </p>
          <ol className="ranks" aria-label={`${metricLabel} ranking`}>
            {ranked.map((row) => (
              <li key={row.account.id}>
                <span className="rank-name">@{row.account.handle}</span>
                <span className="rank-track" aria-hidden="true">
                  <span style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
                </span>
                <span className="mono">{formatCount(row.value)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
