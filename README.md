# Slop-Chop

Block monitor for a community-curated list of AI slop posters. The page shows recorded new blocks for [@ghostnshells](https://x.com/ghostnshells). It is a static site: the numbers live in [`data/dataset.json`](data/dataset.json), and the UI does not need a code change when those numbers change.

List membership is a community assessment, not independent evidence. Public lifetime post counters, when a profile export is present, are profile activity. They are not measured AI slop volume. The monitor’s newly blocked total is not the full X block list.

## Seeded facts

These are the committed observations, not a live reconciliation.

| Measurement | Value | What it is |
| --- | --- | --- |
| Monitor through Nov 7 | 861 | Nov 1–6 remain 797. Nov 7 recorded runs add 64. Verified only through about 11:34 PM ET, not through midnight. |
| X blocks at Nov 7, 11:33 PM ET | 859 | Latest full block list. List size 811, all blocked on the list, 0 unblocked. Not the monitor sum. |
| Nov 7 same run | 38 | 37 previously pending accounts, including @mdp_sec, plus @hiimsimsas. The 16:13 row is bookkeeping for that extra account, not a separate observed minute. |
| Pending | none | The Nov 6 unapproved-37 work is closed. |
| Earlier timestamps | kept | Including Nov 6 11:37 PM ET at X blocks 798 and list 794. |

Nov 6 still has its unresolved one-account gap (452 at 9:00 AM plus 347 would be 799; observed X blocks were 798) and 237 of 347 handles. Lifetime post counts remain public profile counters, not measured AI slop volume. People who left the list stay blocked.

## Preview

```bash
npm install
npm run dev
```

Open the printed local URL. `npm run build` writes a static site to `dist/`. `npm run preview` serves that build.

```bash
npm test
npm run lint
npm run validate
npm run build
```

## Update the numbers

Nightly updates are pull requests. The exact file, schema, and commands are in [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md).

Short version:

1. From a verified log, write `data/inbox/<export_id>.json`.
2. `npm run ingest` upserts by stable id into `data/dataset.json`. Submitting the same export again is a no-op. The same event id replaces a row. It does not add a second copy.
3. `npm test && npm run validate && npm run ingest -- --check`
4. Open a pull request. Do not merge it until the numbers have been reviewed.

No X API key, scraping credential, or other secret belongs in the repo or in the browser bundle. This site never calls X.

## Scheduled check

[`.github/workflows/data-refresh.yml`](.github/workflows/data-refresh.yml) runs on a schedule and does nothing unless the repository variable `DATA_REFRESH_SOURCE` is exactly `inbox`. In that mode it only validates JSON already committed under `data/inbox/`. It does not poll an API, merge data, push, or deploy. The way new observations arrive is still a reviewed pull request.

## Deploy

The build is static files in `dist/`. Any static host can serve them. Nothing here has been deployed, and the repository visibility is unchanged. Publish only after an explicit decision to do so.

## Blockers

- Nov 6 is incomplete. Do not backfill the remaining 237.
- Profile rankings have no verified per-account export. The explorer explains how to add one instead of showing invented handles.
- Run journals did not include full handle lists for the large batches. Those rows keep the count and set `handles_complete` to false.
- The Nov 1 evening block is stored as the 9:00 PM ET journal run (the PM half of the 41). A different clock time is a data correction, using the superseded-id steps in the contract, not a second insert.
