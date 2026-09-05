# CI Outage Witness

CI Outage Witness helps maintainers investigate one delayed, silent, or failed
GitHub Actions run. It gathers available evidence into one redacted ZIP for
review.

The CLI collects run details, job timing, retry attempts, available logs, local
runner files you choose, and current GitHub Status. Its evidence label is not a
root-cause verdict.

## Try the sample

Open the isolated browser sample:

<https://ci-outage-witness.sociobot.in/demo/>

Or run the real binary with bundled sample data:

```sh
gh-outage-witness --demo
```

When installed as a GitHub CLI extension, use:

```sh
gh outage-witness --demo
```

The command creates a new temporary directory and prints the sample bundle
path. It needs no account, token, or network connection. See
[`.factory/demo.md`](.factory/demo.md) for the sample and reset details.

## Install

Install the GitHub CLI extension:

```sh
gh extension install B-Divyesh/gh-outage-witness
gh outage-witness --help
```

Or build and install the single Rust binary:

```sh
cargo install --locked --git https://github.com/B-Divyesh/gh-outage-witness
```

The CLI reads `GH_TOKEN` or `GITHUB_TOKEN`. It otherwise checks the current
GitHub CLI session.

## Capture an incident

Capture one GitHub-hosted runner incident:

```sh
gh outage-witness OWNER/REPO 123456789
```

Include a local runner journal and a repository-specific redaction:

```sh
journalctl -u actions.runner.acme-api.prod-01 > runner-journal.txt
gh outage-witness OWNER/REPO 123456789 \
  --runner-log runner-journal.txt \
  --redact 'customer_[A-Za-z0-9]+' \
  --output incident-123456789.zip
```

Use the JSON result in automation:

```sh
gh outage-witness OWNER/REPO 123456789 --json --strict
```

`--strict` writes the bundle, then exits `5` when optional evidence is missing.
Without it, a partial capture exits successfully and records each missing
source.

### Bundle contents

- `summary.md` explains the label, signals, caveats, and source states.
- `manifest.json` records versions, times, attempts, and source states.
- `evidence/` contains redacted run, job, attempt, and public status data.
- `logs/` contains available Actions logs with ANSI control codes removed.
- `runner/` contains only local diagnostic files passed with `--runner-log`.
- `redaction-report.json` contains replacement counts, never removed values.

Known credential formats and configured patterns are removed before files enter
the bundle. Pattern matching cannot find every unusual secret. Review every
file before sharing.

On Unix, the output ZIP uses owner-only `0600` permissions. The CLI refuses to
replace an existing path unless `--force` is present.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | Bundle captured |
| 2 | Invalid arguments or redaction expression |
| 3 | Target Actions run unavailable |
| 4 | Output bundle could not be written |
| 5 | Bundle written, but strict mode found missing evidence |

## Develop and verify

Prerequisites are Node.js 22+, npm, Rust 1.85+, `unzip`, and Chromium for
Playwright. Playwright 1.58.2 is pinned in `package.json`.

From a clean checkout:

```sh
npm ci
npm audit --audit-level=high
cargo fmt --all -- --check
npm test
npm run build
cargo package --locked --allow-dirty
npm run pack:cli
npm run verify:package
```

`npm run build` creates the deployable site in `dist/site/` and the executable
in `dist/cli/`. `npm run pack:cli` creates release archives without publishing.

Every public product claim is declared in [`.factory/claims.json`](.factory/claims.json).
Run all claim checks together with:

```sh
npm run test:claims
```

## Privacy and scope

The CLI makes read-only requests to the configured GitHub API and public status
endpoint. It does not retry runs, write to GitHub, or upload a bundle. GitHub
credentials are not sent to the separate status endpoint or written to the
bundle.

The site uses no cookies, analytics, advertising, forms, or third-party runtime
requests. Its service worker caches public files for offline use. The demo uses
only a `demo:` storage key.

CI Outage Witness is free under the [MIT License](LICENSE). Read the deployed
[privacy policy](https://ci-outage-witness.sociobot.in/privacy/) and
[terms](https://ci-outage-witness.sociobot.in/terms/).
