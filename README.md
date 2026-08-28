# CI Outage Witness

CI Outage Witness is a free, read-only GitHub CLI extension for maintainers who
need an incident receipt when an Actions run is slow, silent, or unexpectedly
fails. It gathers the run and every attempt, job timing, available logs, local
runner diagnostics you provide, and timestamped GitHub Status observations into
one redacted ZIP.

The witness reports evidence, signals, and uncertainty. It does not retry jobs,
replace CI, or claim a root cause that the captured data cannot support.

## Install

Install as a GitHub CLI extension:

```sh
gh extension install B-Divyesh/ci-outage-witness
gh outage-witness --help
```

Or build the single binary with Rust 1.85+:

```sh
cargo install --git https://github.com/B-Divyesh/ci-outage-witness
```

CI Outage Witness uses `GH_TOKEN` or `GITHUB_TOKEN`, then falls back to
`gh auth token`. Public runs can be read without authentication, subject to a
lower API rate limit. It never writes to GitHub; `actions:read` and
`contents:read` are sufficient.

## Usage

Capture one hosted-run incident:

```sh
gh outage-witness OWNER/REPO 123456789
```

Attach local self-hosted runner journals and add project-specific redactions:

```sh
journalctl -u actions.runner.acme-api.prod-01 > runner-journal.txt
gh outage-witness OWNER/REPO 123456789 \
  --runner-log runner-journal.txt \
  --redact 'customer_[A-Za-z0-9]+' \
  --output incident-123456789.zip
```

Use the stable machine-readable result in automation:

```sh
gh outage-witness OWNER/REPO 123456789 --json --strict
```

`--strict` still writes the bundle, then exits `5` if an optional source such
as logs or GitHub Status could not be collected. Without it, partial evidence
is a successful capture and omissions are recorded in the bundle.

### Bundle contents

- `summary.md` — human-readable finding, supporting signals, and caveats.
- `manifest.json` — schema version, observation time, lineage, and source state.
- `evidence/run.json`, `jobs.json`, and `attempts/*.json` — redacted API facts.
- `evidence/platform-status.json` — timestamped public status observation.
- `logs/` — each available GitHub Actions log, with ANSI escapes removed.
- `runner/` — redacted local runner diagnostics explicitly supplied by you.
- `redaction-report.json` — replacement counts, never the removed values.

Default and custom redaction patterns are applied before anything is written.
Always inspect a bundle before sharing: pattern-based redaction cannot prove
that arbitrary secret values embedded in prose were recognized.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | Bundle captured (possibly partial; inspect `manifest.json`) |
| 2 | Invalid arguments or redaction expression |
| 3 | The target Actions run could not be collected |
| 4 | The output bundle could not be written |
| 5 | Bundle written, but `--strict` found partial evidence |

## Develop and verify

```sh
npm install
npm test
npm run build
```

`npm run build` creates the static deploy at `dist/site/` and platform binaries
at `dist/cli/`. `npm run pack:cli` creates release archives without publishing.
The docs site alone can be built with `npm run build:site` and served with
`npm run dev`.

## Privacy and security

The CLI is local-first and contains no telemetry. It makes read-only requests
to the configured GitHub API and `www.githubstatus.com`; it writes only the
output bundle you requested. Runner diagnostics are read from local files only
when supplied. The documentation site has no analytics, cookies, forms, or
third-party runtime requests. See the deployed `/privacy/` and `/terms/` pages.

## Scope and support

CI Outage Witness is designed for GitHub Actions and GitHub Enterprise API
hosts. Classification is intentionally conservative: “probable platform
degradation” is an evidence label, not a provider root-cause determination.
Open an issue with a sanitized manifest and summary; never attach an unreviewed
bundle to a public issue.

Licensed under the [MIT License](LICENSE).
