# Verify CI incident evidence capture — FAIL

- Work order: `ci-outage-witness-verify-3`
- Verified: 5 September 2026 UTC
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Implementation reviewed: `70d51965be55fb1f7dbe2dd246f42ae996072318`
- Live site source: `6d8f560ae664cf9d6bb34e00f6fa7bacbee9287c`
- Documentation SHA at verification start: `6442123f95571f87e219115a2aa1d8ac6dc05b4a`
- Verdict: **FAIL**
- Findings: **2** — one high, one medium
- Untested claims: **0**

The candidate code builds, all 20 declared claim commands pass, the prepared
v0.1.2 archive works, and the live site matches the final local site build.
Acceptance still fails because the primary public extension install delivers
v0.1.1 without the advertised sample command, and the demo banner is outside
the page landmarks.

## Job, audience, and first action

Before scrolling in fresh desktop and 390 px phone contexts:

- Job: capture evidence for one failed GitHub Actions run.
- Audience: maintainers investigating delayed, silent, or failed Actions runs
  before logs or public status change.
- First action: **Try it with sample data**. Its adjacent note says it opens a
  saved incident with no setup.

All three are visible in the first viewport on desktop and phone. The heading
is seven words, the audience sentence is 15 words, and the copy contains no
metaphorical section headings or banned marketing terms.

## Findings

### V3-001 — High — the public extension install does not deliver the advertised sample command

The live site and public README tell a user to install the extension and then
run `gh outage-witness --demo`. In a fresh GitHub CLI configuration, the
documented install succeeded but selected the latest published release,
v0.1.1:

```text
gh extension install B-Divyesh/gh-outage-witness
gh extension list
gh outage-witness  B-Divyesh/gh-outage-witness  v0.1.1
gh outage-witness --demo
error: unexpected argument '--demo' found
exit 2
```

The GitHub release endpoint for v0.1.2 returns HTTP 404. The repository's
public `main` branch is correctly at `6442123`, and the alternative documented
`cargo install --locked --git ...` path installs v0.1.2 and runs the demo.
The prepared v0.1.2 archive also works from an empty consumer directory. Those
alternatives do not make the primary extension command true for a visitor.

This also exposes incomplete claim coverage: `@claim:cli-demo-offline` tests
the locally built candidate, not the artifact selected by the documented
`gh extension install` command. The claim was manually tested and failed, so
it is a finding rather than an untested claim.

Required disposition: the factory operator must publish the prepared v0.1.2
GitHub release, then verify a fresh extension installation selects v0.1.2 and
passes `gh outage-witness --demo`. Add that installed-release path to the claim
sandbox so a future release lag cannot pass the registry.

Evidence: `/work/.evidence/verify-3/public-install.log`.

### V3-002 — Medium — the persistent demo controls are outside a landmark

Axe 4.10.2 reports one `region` violation on `/demo/` in both fresh desktop
light mode and 390 px dark/reduced-motion mode:

```text
impact: moderate
target: .demo-banner
help: All page content should be contained by landmarks
```

The banner is a visible sibling before `header`, `main`, and `footer`. Its
`aria-label` does not make the plain `div` a landmark. Keyboard operation,
names, focus, contrast, and screen-reader status text otherwise pass, and there
are zero serious or critical axe findings. This is not a blocked user path,
but it fails the required complete landmark structure.

Required disposition: make the banner a named landmark, such as a suitable
`aside` or `role="region"`, then assert zero axe violations on the demo at both
viewports instead of filtering to serious and critical findings.

Evidence: `/work/.evidence/verify-3/axe-live.log`.

## Declared claims

Every command in `.factory/claims.json` was run separately after `npm ci` in a
fresh clone at `6442123`. Every tag occurs exactly once in the test sources.

| Claim | Result | Observed evidence |
| --- | --- | --- |
| `cli-demo-bundle` | Pass | Demo ZIP contained 10 populated incident files. |
| `missing-evidence` | Pass | Unavailable Actions logs retained a source state and reason. |
| `status-uncertainty` | Pass | Status had an observation time and after-the-fact uncertainty. |
| `cli-demo-offline` | Pass for candidate; public distribution fails in V3-001 | Built binary completed with unusable proxies and no token. |
| `archive-private` | Pass | Fresh Unix archive mode was `0600`. |
| `redaction` | Pass | ANSI, credential assignments, and configured match were absent. |
| `token-exclusion` | Pass | Decoy token was absent from ZIP and status request. |
| `read-only-requests` | Pass | Local witness received GET requests only. |
| `runner-opt-in` | Pass | Runner evidence appeared only when supplied. |
| `available-logs` | Pass | Available ZIP log was stored, cleaned, and marked collected. |
| `authentication-inputs` | Pass | `GH_TOKEN`, `GITHUB_TOKEN`, then `gh auth token` order passed. |
| `json-output` | Pass | Standard output parsed with repository, run, and partial state. |
| `output-recovery` | Pass | Existing output remained unchanged; `--force` recovered safely. |
| `strict-partial` | Pass | Partial ZIP was written and strict mode returned 5. |
| `web-demo-sandbox` | Pass | Sample state used `demo:` storage and preserved the real sentinel. |
| `site-privacy` | Pass | Requests stayed same-origin; no cookies or session storage appeared. |
| `offline-site` | Pass | Saved demo and its label reloaded offline. |
| `mit-license` | Pass | Complete MIT text and visible license fact were present. |
| `terminal-recording` | Pass | Command, label, and output name matched the real v0.1.2 demo. |
| `packaged-cli` | Pass | Candidate binary ran from an otherwise empty consumer directory. |

The clean per-claim log contains 20 `CLAIM_START` and 20 `CLAIM_PASS` lines:
`/work/.evidence/verify-3/claims-clean.log`.

## Live browser and demo evidence

Fresh Chromium contexts covered 1440×1000 desktop and 390×844 phone layouts,
light and dark treatments, and reduced motion.

- `/`, `/demo/`, `/privacy/`, and `/terms/` returned 200 with route-specific
  titles, one h1, one main landmark, canonical metadata, and no console errors.
- An unknown URL deliberately returned the designed page with HTTP 404, the
  title `Page not found — CI Outage Witness`, and working recovery links. This
  expected status is not a defect.
- Every non-fragment link on the checked pages returned 200, including the
  public source repository.
- The skip link is first, keyboard actions work with Enter or Space, focus is
  visible, command scrollers accept focus, and controls measure at least
  44×44 CSS px.
- The phone layout has no horizontal overflow. At 390 CSS px it also covers
  reflow at 200% zoom for a 780 px-wide viewport.
- Reduced motion sets the hero animation to `0.01ms`; smooth scrolling is
  disabled. There is no flashing or autoplay.
- Root, privacy, terms, and 404 have zero axe violations. The demo has only
  V3-002; serious and critical findings are zero everywhere.

The one-click sample opened directly with run `44500807`, three attempts, an
18-minute queue wait, unavailable logs, a runner journal, a status observation,
and `Probable platform degradation`. The demo label stayed visible at the
bottom of the page. Changing to the runner case persisted after reload. Reset
restored the platform sample and focused the selector. `Start for real` removed
only `demo:ci-outage-witness:scenario`; a seeded `real:incident` sentinel never
changed.

The service worker updated to cache `ci-outage-witness-v4`. After the first
visit, a fresh demo context reloaded offline with its populated output and
clear offline status. Runtime traffic was same-origin GET/HEAD only; cookies
were empty. The privacy page explains local storage/cache removal and directs
privacy questions to the public repository without asking users to post a
bundle or secret.

Evidence: `/work/.evidence/verify-3/live-browser.json`, screenshots in the same
directory, and `/work/.evidence/verify-3/verify-live.log`.

## Clean build and CLI evidence

The documented prerequisites were installed before measurement: Node
22.23.2, npm 10.9.8, Rust/Cargo 1.98.0, unzip 6.00, Playwright 1.58.2 Chromium,
and GitHub CLI 2.45.0.

From the fresh clone:

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

All commands passed. Results were 8 Rust unit tests, 4 CLI integration tests,
1 doctest, strict Clippy, the package contract, and 24 browser tests. The build
created `dist/site/` and `dist/cli/`. Cargo packaged and verified 21 files. The
clean package consumer observed four GET requests, complete quoted-secret
redaction, valid JSON, and mode `0600`.

The independently extracted archive passed `--version`, `--help`, and a
network-disabled `--demo`. Its sample ZIP had 10 entries, a timestamped and
uncertain status observation, three retry attempts, a redaction report, and no
sample credential, configured identifier, or ANSI escape. A token-free capture
of public run `actions/checkout#32904951246` collected run, job, attempt, and
status evidence. GitHub's 403 for logs was recorded as unavailable; strict mode
wrote a `0600` bundle and returned 5.

Manual installed-artifact paths also returned the documented codes:

- no arguments, malformed repository, run ID 0, invalid regex: 2;
- `u64::MAX` unavailable run: 3 and no bundle;
- existing output: 4 without replacement;
- `--force`: 0, replaced the bundle, and restored mode `0600`;
- strict optional-evidence failure: 5 after writing the partial bundle.

The v0.1.2 binary is 4,709,552 bytes with SHA-256
`2043081b3c0a13965df1b974dad568736db1002968e9bed469efe78f65febe16`.
The fresh tarball is 2,051,455 bytes; gzip timestamps make its archive digest
vary between pack runs, while the executable digest matches the prior handoff.

This product has no backend, tenant state, server process, database, health
endpoint, or product rate limiter. Backend isolation, restart persistence, and
429/`Retry-After` checks do not apply.

## Deployment identity, security, and performance

Twenty-four served files, excluding the deployment-only
`staticwebapp.config.json`, are byte-identical to the fresh local build. Root
SHA-256 is `f5a87939f2ea3a3a206d02344c838997b25d3ac9560643c3aac47e1905cd28c4`;
demo SHA-256 is `a226038aa18b647221d68676dfae0df9407ae56ae4846340663fe2b83038b328`.
The site files have not changed since `6d8f560`; later product work through
`70d5196` is CLI-only, followed by tests and reports.

HTTP redirects to HTTPS. Responses include CSP, HSTS, `nosniff`, no-referrer,
same-origin opener policy, and restrictive device permissions. Hashed assets
are immutable for one year; HTML revalidates and returned 304 to an ETag check.

Fresh mobile Lighthouse 12.8.2 scored 100 for performance, accessibility,
best practices, and SEO. FCP was 1.2 s, LCP 1.4 s, total blocking time 0 ms,
CLS 0.001, and transfer was 89 KiB. The build contains 4,932 bytes of
JavaScript, 17,111 bytes of CSS, 63,068 bytes of fonts, and a 15,864-byte mobile
hero image, all within budget.

AI-assisted analysis is not missed leverage here. A deterministic, local,
reviewable receipt is safer for incident evidence than an optional model-based
root-cause guess, and the product already imports API evidence and exports a
shareable ZIP.

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| V-001 invalid extension naming | Resolved. The public repository and binary use `gh-outage-witness`; a fresh extension install succeeds. V3-001 is a later release-version gap. |
| V-002 quoted secret leak | Resolved. Unit, claim, package-consumer, and archive inspection remove the whole quoted value. |
| V-003 world-readable ZIP | Resolved. Demo, public capture, strict partial, and forced replacement all measured `0600`. |
| V-004 mobile command focus | Resolved. Both scrollers focus at 390 px and no `scrollable-region-focusable` issue remains. |
| V-005 43 px Terms target | Resolved. Live control measurement is at least 44×44 px. |
| R-001 missing claims registry | Resolved. Twenty entries exist, each tag occurs once, and all 20 commands were run separately. |
| R-002 no CLI sample | Resolved in v0.1.2 source and archive. Public extension delivery remains open as V3-001. |
| R-003 no isolated browser sample | Resolved. `/demo/` is populated, labelled, persistent, resettable, and namespace-isolated. |
| R-004 indirect first-screen copy | Resolved. Job, audience, and sample action are literal and visible before scrolling. |
| R-005 incomplete metadata/skeleton | Resolved. Route metadata, navigation, footer, attribution, version, social image, legal pages, and designed 404 are present. |

## Required disposition

**FAIL — 2 findings and 0 untested claims.** Publish and independently install
the v0.1.2 extension release, repair the demo landmark, and rerun the affected
public-install, claim, live axe, and full regression checks before acceptance.
