# Independent product verification — FAIL

- Candidate: `2c173a130649cf2f8645736ea2bb95621d6e8173`
- Remote: `origin/main` resolved to the same commit during verification
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Verified: 2026-08-28 UTC
- Environment: Node 22.23.2, npm 10.9.8, Rust/Cargo 1.98.0,
  Playwright 1.58.2 Chromium, GitHub CLI 2.98.0, Lighthouse 12.8.2
- Verdict: **FAIL**

The source checkout builds and its standalone binary performs useful captures,
and the live documentation is an exact deployment of the candidate site.
Release acceptance still fails because the advertised GitHub CLI installation
cannot work, two privacy guarantees fail in realistic use, and the 390px page
has serious axe findings.

## Release-blocking defects

### V-001 — Critical — advertised CLI installation is impossible

The primary install command on the live site and in the README is not a valid
GitHub CLI extension installation:

```text
$ gh --version
gh version 2.98.0 (2026-08-20)
$ GH_PROMPT_DISABLED=1 gh extension install B-Divyesh/ci-outage-witness
extension name must start with `gh-`
exit 1
```

The live source link and unauthenticated GitHub API request both return 404,
so the claimed free/open-source repository is also unavailable to the intended
public user. There is no user-accessible fallback artifact at the product URL.
The locally produced release archive works when manually extracted, but users
cannot reach that private build artifact through the documented workflow.

For the advertised `gh outage-witness` command, the extension repository and
binary need GitHub CLI-compatible naming (normally `gh-outage-witness`) and a
public release/repository. If the chosen name is `gh-ci-outage-witness`, the
documented invocation must instead match that installed extension name.

### V-002 — High — built-in redaction leaks part of a quoted secret

A packaged-binary capture with this realistic runner diagnostic:

```text
PASSWORD="correct horse battery staple"
TOKEN=singleword
AUTHORIZATION: Bearer bearer-token-value
```

wrote the following into `runner/63`:

```text
PASSWORD=[REDACTED] horse battery staple"
TOKEN=[REDACTED]
AUTHORIZATION: Bearer [REDACTED]
```

The assignment regex stops at the first whitespace, leaving most of the quoted
password in the shareable bundle while incrementing the redaction count. This
contradicts the brief's secret-stripping constraint and the privacy page's
statement that sensitive assignments are replaced. The general review warning
does not make a recognized, partially replaced assignment safe.

### V-003 — High — sensitive output archive is created world-readable

All independently created incident bundles had mode `0644` under the standard
umask:

```text
644 /tmp/ci-witness-consumer.t14D37/incident.zip
644 /tmp/ci-witness-real.9Evton/real.zip
644 /tmp/ci-witness-redact.7i3Pd4/redact.zip
```

Entries inside the ZIP are marked `0600`, but that does not protect the outer
archive. On a multi-user workstation or self-hosted runner host, another local
user can read the whole ZIP, including attached runner journals and any secret
the pattern-based redactor misses. A privacy-first incident tool should create
the archive itself with owner-only permissions.

### V-004 — High — 390px page has serious keyboard accessibility findings

Fresh axe 4.10.2 analysis on the live root at 390x844, dark mode, and reduced
motion reports `scrollable-region-focusable` with serious impact for two nodes:

- `.command-block:nth-child(1) > code`
- `.command-block:nth-child(2) > code`

Both install/capture command regions become horizontally scrollable on mobile
but cannot receive keyboard focus. The repository's mobile test checks overflow
but does not run axe; its axe tests use the desktop viewport, so the gate misses
this contract failure.

### V-005 — Low — one live touch target is under the 44px minimum

At both checked viewports, the footer “Terms” link measured 43x44 CSS px. The
contract requires every touch/click target to be at least 44x44 CSS px.

## Build and repository gates

Started from a clean checkout at the candidate commit. No product code was
modified.

- `npm ci`: pass; 23 packages installed; 0 vulnerabilities.
- `cargo fmt --all -- --check`: pass.
- `npm audit --audit-level=high`: pass; 0 vulnerabilities.
- `npm test`: pass.
  - 6 Rust unit tests passed.
  - 2 compiled CLI contract tests passed.
  - 1 Rust doctest passed.
  - Clippy passed with `-D warnings`.
  - 9 local Playwright tests passed.
- Exact `npm run build`: pass; produced `dist/site/` and
  `dist/cli/gh-ci-outage-witness`.
- Release binary: 4,633,584 bytes; SHA-256
  `9e98840a8e25f229d35cf4a31d1a56110aaa8626504979bee87ba0a81ad453e7`.
- `cargo package --locked`: pass; package verification compiled successfully.
- `npm run pack:cli`: pass; produced
  `ci-outage-witness_0.1.0_linux_x86_64.tar.gz` (2,023,239 bytes).
- The release archive was extracted into a new temporary consumer. Its binary
  was executable, byte-identical to `dist/cli/gh-ci-outage-witness`, and
  successfully ran `--version`, `--help`, and a complete mocked capture.

There is no separate TypeScript/typecheck or JavaScript lint script in the
repository. Rust formatting and Clippy are the available type/lint gates.

## CLI end-to-end evidence

### Real GitHub case

The packaged release binary captured public run `actions/checkout#32904951246`
without a token. Run metadata, one job, attempt metadata, and GitHub Status were
collected. GitHub denied the log archive with 403, which was honestly recorded
as unavailable.

- With `--strict --json`: exit 5, valid JSON printed, partial ZIP still written.
- Without `--strict`: exit 0, JSON reported `"partial": true`, ZIP written.
- Invalid/nonexistent run `18446744073709551615`: exit 3, actionable error,
  no ZIP written.

### Controlled normal, invalid, privacy, and recovery cases

A local HTTP witness recorded the exact outbound requests from the packaged
binary. API calls carried `Authorization: Bearer qa-secret-token-value`; the
separately configured status request carried no Authorization header. Every
request was GET and used `ci-outage-witness/0.1.0` as its user agent.

The normal capture wrote a valid ZIP containing the manifest, summary, run,
jobs, status observation with timestamp/uncertainty, attempt metadata, and
redaction report. `--no-logs` was represented as `not-requested`, not as a
failure. A runner communication marker produced `runner-failure` with medium
confidence, and a custom identifier plus an unquoted token were redacted.

Argument/recovery results:

- no arguments: exit 2 with usage;
- malformed repository: exit 2 with expected format;
- run ID 0: exit 2 with positive-integer explanation;
- invalid redaction regex: exit 2 with regex error;
- existing output without `--force`: exit 4 and original archive retained;
- repeat with `--force`: exit 0 and replacement succeeded;
- optional source failure in non-strict mode: exit 0 with partial state;
- optional source failure in strict mode: exit 5 after writing the bundle.

Boundary values exercised included run ID 0 and `u64::MAX`, an empty job list,
no requested logs, unavailable logs, an attached runner log, an invalid custom
regex, output collision, and forced recovery.

## Live deployment identity and browser checks

`origin/main` and local HEAD both resolved to the candidate commit. The live
root HTML and every deployed candidate artifact checked below were byte-for-byte
identical to `dist/site`: JS, CSS, both fonts, all three WebPs, service worker,
privacy, terms, 404, SVG mark, robots, and sitemap. The live root HTML SHA-256
was `a16d437f3959fbadd45a4eb833d478a69bcfb33c8b45597060e27cdcc746413c`.
This establishes that the site deployment matches the candidate even though no
explicit commit/build-identity response header is exposed.

Fresh Chromium checks covered 1440x1000 desktop and 390x844 mobile, light and
dark schemes, reduced motion, mouse-independent demo operation, focus, and
offline reload.

- Root: HTTP 200, correct title and `lang=en`, one h1, one main, all images
  have alt text, and no horizontal page overflow.
- Keyboard: skip link is first; its 3px focus ring is visible in light and dark;
  scenario selection, submit, result, and reset are operable without a mouse.
- Demo: empty, result, partial, and reset states behaved correctly.
- No page exceptions or console errors on the root, privacy, or terms pages.
- Privacy and terms: HTTP 200, one h1/main each, no serious/critical axe issues
  at 390px dark/reduced-motion.
- 404: correct HTTP 404 and custom semantic page.
- Reduced motion: animation duration became 0.01ms, one iteration, and smooth
  scrolling became `auto`.
- Runtime requests were same-origin only. Source inspection found no analytics,
  cookies, storage, telemetry, third-party fonts/scripts, or mutation requests.
- Service worker: active and controlling; `registration.update()` succeeded;
  cache `ci-outage-witness-v2` contained the shell and hashed assets; a true
  offline reload restored the page and displayed the offline status with no
  page/console errors.
- Visual inspection found the intended product-specific ceramic design intact
  on desktop and 390px mobile, with readable hierarchy and no clipping.

The root and its assets send CSP, `nosniff`, HSTS, COOP, no-referrer, and a
restrictive Permissions-Policy. CSP limits runtime resources and connections to
self. HTML and `sw.js` use `public, must-revalidate, max-age=30`; hashed assets
and WebPs use `public, max-age=31536000, immutable`; conditional requests
returned 304. An unknown route returned the candidate 404 page with status 404.

The only browser request failure observed during one instrumented run was an
aborted same-origin connectivity HEAD probe during page teardown; it caused no
console error or incorrect UI state.

## Performance and bundle budgets

Fresh live simulated-mobile Lighthouse 12.8.2 result:

- Performance 90
- Accessibility 100 (Lighthouse does not expose the 390px axe issue above)
- Best Practices 100
- SEO 100
- FCP 1.2s; LCP 1.4s; TBT 420ms; CLS 0.001; Speed Index 1.5s
- INP was not measured in the synthetic no-interaction run.

The live first load made 8 requests and transferred 89,778 bytes (107,948
uncompressed resource bytes). Production assets remain within contract:

- JavaScript 4,802 bytes (budget 200 KiB)
- CSS 14,340 bytes (budget 50 KiB)
- Fonts 63,068 bytes total (budget 120 KiB)
- Mobile hero 15,864 bytes; largest hero 53,122 bytes (budget 300 KiB)

## Required disposition

Do not release this candidate. Resolve V-001 through V-004, add regression tests
for GitHub CLI installation naming, quoted/multi-word secret assignments, outer
ZIP mode, and 390px axe, then rerun the entire verification. V-005 should be
fixed in the same accessibility pass.
