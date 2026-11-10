# Clankwall nightly refresh

Clankwall metrics on this site come from the public feed at [https://clankwall.vogel.dev](https://clankwall.vogel.dev), run by [@ryanvogel](https://x.com/ryanvogel). No API key is used. The home page is not a data source.

The committed file is `data/clankwall/current.json`. The UI reads that file. A new snapshot does not require a UI change.

## What the page keeps separate

- Clankwall’s own totals: every flagged account, how many have an AI flag, and how many are spam-only (`ai_flags` = 0). Spam-only is not labeled AI slop.
- Our block read: the latest monitor snapshot whose `source` is `clankwall-ai-feed`. For the Nov 9, 11:09 PM ET read that is 775 blocked of 787 on that feed, with 12 not blocked because they were suspended or inactive. That figure is our comparison to the X block list. It is not Clankwall’s flag count.
- Username matches against handles stored in this repo. A handle that is absent is “not in our named records.” It is not marked unblocked.

`flag_rule` from the feed is shown as written. Flags count sampled replies scoring above 0.60. They are signals, not proof.

## Drop a snapshot by hand

Save a full published snapshot as:

`data/clankwall/inbox/<snapshot-id>.json`

Accepted shapes:

- The verified export shape: `source`, `meta_all` (`snapshot`, `generated_at`, `total`, `flag_rule`), optional `meta_ai.total`, and `accounts` for every account.
- A full public page whose `accounts.length` equals `total` and whose `next` link is absent.

Each account needs `id`, `username`, `spam_flags`, `ai_flags`, `sampled`, `spam_peak`, and `ai_peak` (`null` when there is no AI peak).

Then:

```bash
npm run clankwall:ingest
npm test && npm run lint && npm run validate && npm run clankwall:ingest -- --check
```

`clankwall:ingest` checks that the account count equals `total`, ids are unique, and `meta_ai.total` matches `ai_flags > 0` when that field is present. A bad file exits non-zero and leaves `data/clankwall/current.json` unchanged. The same snapshot id and same accounts are a no-op. A new snapshot id replaces the current account list and appends one totals row to `data/clankwall/history.json`. That history is only snapshots that were actually imported.

## Public refresh

```bash
CLANKWALL_REFRESH=public CLANKWALL_REFRESH_WRITE=1 npm run clankwall:refresh
npm run clankwall:ingest
```

This follows `https://clankwall.vogel.dev/api/accounts?flag=all&limit=500` and each `next` link. If the snapshot id changes mid-read, or the account count does not equal `total`, it exits and does not replace the last good file. With `CLANKWALL_REFRESH_WRITE` unset, the command only reports whether the committed snapshot id still matches the public feed.

The scheduled workflow runs `npm run clankwall:refresh` only for comparison. It does not write or push. Leave the Actions variable `CLANKWALL_REFRESH` unset to skip the network entirely. Set it to `public` when a nightly mismatch should fail the job so a pull request can import the new snapshot. Any other value is refused.

Open a pull request with `data/clankwall/current.json`, `data/clankwall/history.json`, and the inbox file. Do not merge it until the totals have been reviewed.
