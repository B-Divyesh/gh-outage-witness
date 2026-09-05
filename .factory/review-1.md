# CI Outage Witness review 1 — FAIL

- Work order: `ci-outage-witness-review-1`
- Reviewed: 2026-09-05 UTC
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Implementation candidate: `12447513de03c62c1042d7edfb2ab655cfc5cee2`
- Documentation/verification SHA: `205d8130114316293a9a5e9652e4413bf23b6aa6`
- Verdict: **FAIL**

The implementation candidate is the last commit that changes product code.
Later commits change verification/handoff material, `package.json`, and a
verification script only. The live root SHA-256 is
`7e3a330ce2cc6de06caa63b57cc2de5afb9189b0f6beed514205af6d02009496`, exactly
matching a fresh local build.

## Job, audience, and first action

Before scrolling fresh desktop and 390px phone pages, I found:

- Job: create a redacted evidence bundle for one GitHub Actions incident.
- Audience: maintainers investigating a delayed, silent, or failed GitHub
  Actions run.
- First action shown: `Install the extension`. The secondary link is `Inspect
  an example`; there is no `Try it with sample data` action.

The job and audience are inferred from the long lede, rather than stated in the
required first-screen form. This is R-004.

## Findings

### R-001 — High — no claim registry or executable claim coverage

`.factory/claims.json` does not exist. There are no declared claim commands and
no tagged demo-sandbox tests for public statements. This required file is
missing and leaves **18 untested claims**; a PASS is prohibited while any are
untested.

The untested claims counted are: read-only operation; advertised evidence
collection/redaction; no telemetry; read-only scopes; free/open source; local
example makes no network requests; ANSI and secret removal from logs; runner
files collected only when attached; no write scope; never retries; configured
credentials/patterns removed; missing evidence recorded rather than guessed;
offline docs/example; Unix owner-only archive; token excluded from bundles; no
site cookies/analytics/advertising/fingerprinting/forms/third-party requests;
offline service-worker cache; and no automatic upload.

Evidence: the `.factory/` inventory contains no claims file, and the passing
local tests contain no `@claim:` test tags. These statements occur on the live
landing, privacy page, README, and/or CLI help.

Required repair: create the registry, give each retained claim exactly one
observable demo/fixture test, and remove statements that cannot be tested.

### R-002 — High — no required CLI one-command sample demo

This is a CLI product, but the shipped binary has no `--demo` and no
`examples/` sample input or `.factory/demo.md` exists. A freshly built binary
returned exit 2 for `dist/cli/gh-outage-witness --demo` with `unexpected
argument '--demo' found`. The landing page also lacks the required self-hosted
terminal recording of the real binary operating on bundled sample data.

The browser-only receipt is not an execution of the artifact and cannot prove
the main CLI job in an isolated consumer environment.

Required repair: ship realistic sample data, implement `gh outage-witness
--demo` (or `demo`) in a temporary directory, print its bundle path, record
that exact flow on the landing page, and document isolation/reset in
`.factory/demo.md`.

### R-003 — High — the web example is not the required demo sandbox

Fresh desktop and phone contexts loaded `/?demo=1` with HTTP 200, but it is the
ordinary landing page: title unchanged, no sample mode, and no `Try it with
sample data` action. `/demo` returns the designed 404 page. Selecting `Public
Actions incident` did show `Probable platform degradation`, four realistic
source states, and Reset restored the empty state. It did not show the required
persistent `Demo — sample data, nothing is saved` label, `Start for real`, or a
separate demo storage namespace.

Neither localStorage nor sessionStorage had data before or after the example.
No real data changed in this static example, but that does not establish the
required distinct demo namespace or persistent warning.

Required repair: make `/demo` or `?demo=1` enter sample mode directly; put the
sample action on the first screen; show the persistent label, Reset demo, and
Start for real; use and test `demo:`-prefixed storage.

### R-004 — Medium — first screen and headings do not use plain words

The h1, `When CI goes silent, keep the receipt.`, is metaphorical rather than
the maintainer's job and exceeds the nine-word headline rule. The 26-word lede
omits the audience and exceeds the 22-word cap. Installation is primary rather
than the required sample action. Other prohibited style appears in `Read the
evidence, not the tea leaves.`, `Make the witness while the incident is fresh.`,
and the 404 heading `This page left no logs.`

Required repair: use short literal headings, state the audience in one
<=22-word sentence, make sample use primary, and add the required
`.factory/copy-audit.md` with sentence counts, flags, and terminology table.

### R-005 — Medium — required metadata and standard skeleton are incomplete

The live root, privacy, terms, and 404 pages have titles, language, h1, main,
favicon, robots, sitemap, and a working 404. They lack canonical links, Open
Graph metadata, Twitter card metadata, and an Apple touch icon. The header has
no Demo or Privacy route link, and the footer omits Param Factory and a
version/build id.

These are site-structure defects, not a defect in the deliberate 404 status:
the checked unknown route correctly returned HTTP 404 with a usable custom page.

Required repair: add route-specific canonical/OG/Twitter metadata, a
product-derived 1200x630 social image, Apple touch icon, consistent nav, and
footer attribution/build identity.

## Earlier findings disposition

| Earlier finding | Current disposition and evidence |
| --- | --- |
| V-001 extension naming | Resolved: documented repo and binary are `gh-outage-witness`; the `npm test` package-name contract passes. The local image lacks `gh`, so external GitHub-CLI installation was not rerun; the clean packaged artifact was exercised instead. |
| V-002 quoted-secret redaction | Resolved: `npm run verify:package` passed with a quoted multi-word password, token, and bearer value absent from runner evidence. |
| V-003 outer ZIP permissions | Resolved: the clean consumer check reported outer bundle mode `0600`. |
| V-004 mobile code scrollers | Resolved: fresh 390x844 dark/reduced-motion live axe found zero serious/critical issues and both command regions accepted focus. |
| V-005 Terms touch target | Resolved: live desktop and phone checks found every visible link/button/select >=44x44 CSS px. |

## What passed

- `npm ci`, `npm audit --audit-level=high`, and `cargo fmt --all -- --check`
  passed; audit reported zero vulnerabilities.
- `npm test` passed: 8 Rust unit tests, 2 Rust CLI tests, 1 doctest, strict
  Clippy, package contract, and 9 Playwright tests.
- `npm run build`, `cargo package --locked --allow-dirty`, `npm run pack:cli`,
  and `npm run verify:package` passed. The last performed a clean extracted
  consumer capture with four GET-only requests, complete quoted-secret removal,
  valid JSON, and mode `0600`.
- `npm run verify:live -- https://ci-outage-witness.sociobot.in/` passed with
  fresh desktop/phone contexts: zero serious/critical axe issues, zero console
  errors, keyboard focus, >=44px targets, 404, reduced motion, service-worker
  update, and offline reload.
- `/opt/fleet/lib/verify-url.sh` passed with a 200 response, title, `lang=en`,
  one h1, main, image alts, labeled buttons, no console errors, and 795 ms load.
- Privacy/terms returned 200 and passed mobile axe checks. Runtime requests
  were same-origin GET/HEAD only. The intentional missing route returned HTTP
  404 and is not counted as a defect.

## Scope notes

This is a local CLI with an explicitly requested output ZIP. Backend tenant
isolation, restart persistence, health endpoints, and server 429/`Retry-After`
checks do not apply. The fresh test image lacks the documented GitHub CLI
executable (`gh: command not found`), so external extension installation was
not repeated; this does not change the packaged clean-consumer result.

## Required disposition

**FAIL — 5 findings, including 3 high-severity findings and 18 untested
claims.** Do not accept the product until every finding is repaired and the
complete claim registry is exercised from the documented demo path.
