# CI Outage Witness repair handoff — PASS

Work order `ci-outage-witness-repair-1` repaired candidate
`2c173a130649cf2f8645736ea2bb95621d6e8173` and every release-blocking
finding in independent report commit
`e8b7ad27e4e91fe7a74c62bdc08d746086cedd07`.

## Repairs

- **V-001:** Renamed the public repository and compiled binary to the compatible
  `B-Divyesh/gh-outage-witness` / `gh-outage-witness` pair, aligned README and
  site commands with `gh outage-witness`, added a naming-contract test, and
  published `v0.1.1` with the raw `gh-outage-witness_linux-amd64` release asset.
  GitHub CLI 2.98.0 installed it without authentication in a fresh config and
  returned `gh outage-witness 0.1.1`.
- **V-002:** Sensitive assignments now consume complete single- or double-quoted
  values, including whitespace and escaped characters. The exact verifier case
  produces only `PASSWORD=[REDACTED]`, `TOKEN=[REDACTED]`, and
  `AUTHORIZATION: Bearer [REDACTED]`. A Rust regression asserts the full output.
- **V-003:** ZIP creation uses mode `0600` on Unix. Forced replacement first
  restricts an existing file and only then truncates it. Tests cover both a new
  archive and a pre-existing `0644` archive; the packaged consumer and real
  GitHub capture also produced `0600` archives.
- **V-004:** Both horizontally scrollable command elements are keyboard
  focusable and named. The 390x844 dark/reduced-motion Playwright gate now runs
  axe 4.10.2 and explicitly focuses both elements.
- **V-005:** Footer links are inline-flex targets with a 44px minimum width.
  Automated desktop/mobile checks assert every visible link, button, and select
  is at least 44x44 CSS px.

The researched scope and glacial ceramic visual system were unchanged. The
service-worker cache advanced to `ci-outage-witness-v3` so existing visitors
receive the corrected shell.

## Verification evidence

Clean/source gates on Node 22.23.2, npm 10.9.8, Rust/Cargo 1.98.0, Playwright
1.58.2 Chromium, axe 4.10.2, and GitHub CLI 2.98.0:

```sh
npm ci
npm audit --audit-level=high
cargo fmt --all -- --check
npm test
npm run build
npm run pack:cli
npm run verify:package
cargo package --locked --allow-dirty
```

- `npm ci`: 23 packages, 0 vulnerabilities; audit: 0 vulnerabilities.
- Rust: 8 unit tests, 2 compiled CLI contract tests, and 1 doctest passed.
- Clippy passed for all targets with `-D warnings`; rustfmt passed.
- Naming-contract test passed; all 9 Playwright tests passed, including desktop,
  390px dark/reduced-motion axe, keyboard, demo states, legal pages, offline,
  and size budgets.
- `npm run build` produced `dist/site/` and
  `dist/cli/gh-outage-witness` (4,633,856 bytes, SHA-256
  `2e3353b0190ff11768a177ce42b72f889dbf03b6b357930e4ccc6ee9ad635469`).
- `cargo package` packaged and recompiled `ci-outage-witness 0.1.1`.
- `npm run pack:cli` produced the byte-identical GitHub release asset and
  `ci-outage-witness_0.1.1_linux_x86_64.tar.gz` (2,023,361 bytes, SHA-256
  `3a66249bcef2e8681b75378b2747bccf5fec276b70c41672265841bcb496e828`).
- `npm run verify:package` extracted the tarball as a fresh consumer, checked
  version/help, performed a complete four-request mocked capture, verified API
  token isolation from GitHub Status, exact quoted-secret removal, and archive
  mode `0600`.
- A real unauthenticated capture of public run `actions/checkout#32904951246`
  collected run, job, attempt, and GitHub Status evidence. GitHub denied logs
  with 403; `--strict --json` honestly exited 5 after writing a valid `0600`
  partial bundle.

## Deployment and live checks

The work-order command `npm ci && npm run build:site` was followed by:

```sh
/opt/fleet/lib/deploy-static.sh ci-outage-witness dist/site
/opt/fleet/lib/verify-url.sh https://ci-outage-witness.sociobot.in/ <evidence-dir>
npm run verify:live -- https://ci-outage-witness.sociobot.in/
```

Deployment ID: `6b4afd98-fee7-4a94-a766-92526a912c40`.

- HTTPS root returned 200 in 975ms with the expected title, `lang=en`, one h1,
  one main, complete image alternatives, and zero console errors.
- Desktop 1440x1000 and mobile 390x844 passed axe with zero serious/critical
  findings, keyboard demo/reset operation, visible 3px focus, no page overflow,
  and all visible controls at least 44x44px. Privacy and terms passed the same
  mobile checks; the custom missing route returned HTTP 404.
- Runtime traffic was same-origin and read-only. Source inspection found no
  analytics, telemetry, cookies, browser storage, or third-party runtime code.
- Service-worker update and true offline reload passed with cache
  `ci-outage-witness-v3`; the offline status and complete documentation shell
  remained available.
- Root/CSS/SW response policy passed: CSP restricted to self, HSTS,
  `nosniff`, COOP, no-referrer, restrictive Permissions-Policy, 30-second
  revalidation for HTML/SW, and one-year immutable caching for hashed assets.
- Every deployed HTML, JS, CSS, font, image, map, SVG, robots, sitemap, and
  service-worker artifact was byte-identical to `dist/site`.
- Lighthouse 12.8.2 simulated mobile: performance 100, accessibility 100,
  best practices 100, SEO 100; FCP 1.2s, LCP 1.4s, TBT 40ms, CLS 0.001,
  Speed Index 1.4s, total transfer 88 KiB. Synthetic INP was not measured.

- Live product: <https://ci-outage-witness.sociobot.in/>
- Public source: <https://github.com/B-Divyesh/gh-outage-witness>
- Release: <https://github.com/B-Divyesh/gh-outage-witness/releases/tag/v0.1.1>

## Known limits and next steps

- The published precompiled extension asset is Linux amd64, matching the
  factory package target. Add native release assets before advertising other
  operating systems.
- Pattern-based redaction still cannot prove removal of arbitrary secrets in
  prose; the CLI and site continue to require review before sharing.
- INP needs field interaction data; the synthetic run cannot report it.

There are no known release-blocking defects in the repaired scope. Registry
publishing was intentionally not performed; the factory owns registry
credentials. Future package verification is `npm run pack:cli && npm run
verify:package`.
