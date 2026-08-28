# CI Outage Witness v0.1.0 — handoff

## What shipped

- A Rust single-binary GitHub CLI extension (`gh-ci-outage-witness`) that takes
  `OWNER/REPO RUN_ID` and produces one local incident ZIP.
- Read-only collection of run metadata, paginated job/step state, every rerun
  attempt, available Actions log archives, an observed GitHub Status summary,
  and explicitly supplied self-hosted runner diagnostic files.
- Built-in credential/assignment/private-key/query redaction, repeatable custom
  regex redaction, ANSI removal, a redaction count report, ZIP path sanitizing,
  100 MiB per-response safety limits, and review warnings.
- Evidence labels for repository failure, runner failure, probable platform
  degradation, and inconclusive incidents. Runner markers take precedence;
  platform labels require temporal correlation; every label states that it is
  not a root-cause verdict.
- Stable `--json` output; documented exit codes; strict partial-evidence mode;
  non-overwriting output by default; GitHub Enterprise API override; no prompts
  or telemetry. GitHub tokens are not sent to the public status host.
- A responsive static landing/docs site with an interactive local receipt demo,
  install and capture commands, explicit limitations, light/dark treatments,
  keyboard and 390px layouts, offline shell/status, 404, privacy, and terms.
- Original generated ceramic witness art in three responsive WebP sizes and a
  hand-authored witness mark. Full prompt and provenance are in `design.md`.

## Build and run

Prerequisites: Rust 1.85+, Node 22+, npm.

```sh
npm ci
npm test
npm run build
```

The exact factory build command is `npm run build`.

- Static deployment root: `dist/site/` (`index.html` is at that root).
- Current-platform release binary: `dist/cli/gh-ci-outage-witness`.
- Local docs server: `npm run dev`.
- Source package check: `cargo package --locked`.
- Current Linux release archive: `npm run pack:cli`, producing
  `dist/package/ci-outage-witness_0.1.0_linux_x86_64.tar.gz`.

Example:

```sh
./dist/cli/gh-ci-outage-witness OWNER/REPO RUN_ID \
  --runner-log runner-journal.txt \
  --redact 'customer_[A-Za-z0-9]+' \
  --output incident.zip
```

Authentication is read from `GH_TOKEN`, `GITHUB_TOKEN`, or `gh auth token`.
The program only performs GET requests. Public repositories also work without a
token at GitHub's lower anonymous rate limit.

## Verification completed

Verified on 2026-08-28 in the factory container:

- `npm test`: pass.
  - 6 Rust unit/integration tests, including a complete mocked GitHub API flow
    through run, paginated jobs, retry attempt, zipped logs, and status.
  - 2 compiled CLI contract tests (`--help` surface and usage exit code).
  - 1 compiling Rust documentation example.
  - Clippy with `-D warnings`.
  - 9 Playwright 1.58.2 tests: desktop semantics, console, axe, keyboard demo,
    copy feedback, 390px overflow, dark/reduced-motion, cached offline behavior,
    privacy/terms, and asset budgets.
- `npm run build`: pass; reproducibly created `dist/site/` and `dist/cli/`.
- `cargo package --locked --allow-dirty`: pass and verified the package.
- `npm run pack:cli`: pass; current-platform archive created.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Factory `verify-url.sh`: HTTP 200, 648 ms local load, no console errors,
  title present, `lang=en`, exactly one h1, main landmark present, no missing alt
  text, and no unlabeled buttons.
- axe: no serious or critical findings in light or dark mode.
- Lighthouse 12.8.2, simulated mobile:
  - Performance 100
  - Accessibility 100
  - Best practices 100
  - SEO 100
  - FCP 1.4 s; LCP 1.5 s; total blocking time 0 ms; CLS 0.001
- Production budgets: initial JS 4.80 KB, CSS 14.34 KB, fonts 63.07 KB,
  mobile hero 16 KB, largest hero 52 KB. All are well below contract limits.
- Visual inspection completed at 1440px and 390px.

## Privacy and operational notes

- There are no analytics, cookies, accounts, payment code, third-party runtime
  scripts/fonts, or remote storage. The site makes only a same-origin
  connectivity probe and caches public documentation assets locally.
- Bundle files are mode 0600 inside the ZIP. Pattern matching cannot prove that
  an arbitrary secret embedded in prose was found; the summary, manifest, site,
  and README all require human review before sharing.
- GitHub Status is an observation taken at collection time. The bundle stores
  its timestamp and uncertainty, and the classifier requires a recent/overlap
  signal before using it for probable platform degradation.

## Known gaps and next steps

- A CLI cannot remotely read self-hosted runner journals with GitHub read-only
  access. Maintainers must export and attach those files with `--runner-log`;
  this is deliberate and documented.
- GitHub's public summary is not a historical-status API. Old runs therefore
  remain inconclusive unless an active incident overlaps their timestamps.
- This worker produced and packed Linux x86_64 only. The factory should build,
  sign, checksum, and attach Linux/macOS/Windows release binaries before making
  `gh extension install` generally available; registry/release publishing was
  intentionally not performed here.
- The pilot success measure still needs field validation across 20 real
  incidents. Use sanitized manifests to tune markers; do not weaken the
  conservative fallback to `inconclusive` merely to increase classification.
- The work order allowed Rust or Go. Go was absent from the container, so the
  implementation uses the requested Rust alternative with clap.
