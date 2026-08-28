# Independent product verification 2 — PASS

- Candidate: `5c4447209f45b9b89daf5d7a003b9389631eae1a`
- Remote: configured origin and the public source both resolved `main` to the candidate
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Public source: <https://github.com/B-Divyesh/gh-outage-witness>
- Release exercised: `v0.1.1`
- Verified: 2026-08-28 UTC
- Environment: Node 22.23.2, npm 10.9.8, Rust/Cargo 1.98.0,
  Playwright 1.58.2 Chromium, axe-core 4.10.2, GitHub CLI 2.98.0,
  Lighthouse 12.8.2
- Verdict: **PASS**

The candidate satisfies the researched CLI job and the factory contract. The
earlier critical/high accessibility and privacy findings are fixed in the
publicly installable extension and live deployment. No release-blocking defect
was found.

## Defects by severity

- Critical: none.
- High: none.
- Medium: none.
- Low: none found.

## Clean checkout and quality gates

Verification ran in a new detached worktree at the exact candidate. The source
worktree remained clean, and no product code was modified.

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

- `npm ci`: passed; 23 packages installed and 0 vulnerabilities.
- `npm audit --audit-level=high`: passed; 0 vulnerabilities.
- Rust formatting: passed.
- `npm test`: passed: 8 Rust unit tests, 2 compiled CLI integration
  tests, 1 doctest, Clippy for all targets with `-D warnings`, the package
  naming contract, and 9 Playwright tests.
- There is no separate JS/TS typecheck or lint script. Clippy and rustfmt are
  the repository's available type/lint gates.
- Exact `npm run build`: passed and produced `dist/site/` plus
  `dist/cli/gh-outage-witness`.
- Release binary: 4,633,856 bytes; SHA-256
  `2e3353b0190ff11768a177ce42b72f889dbf03b6b357930e4ccc6ee9ad635469`.
- `cargo package --locked --allow-dirty`: packaged and recompiled
  `ci-outage-witness 0.1.1` successfully.
- `npm run pack:cli`: produced the standalone binary and Linux amd64 tarball.
  The newly generated tarball was 2,023,361 bytes. Its gzip digest varies with
  staging timestamps, but each extracted file was byte-identical to the
  published archive; the executable digest above also matched the build.
- `npm run verify:package`: passed in a new temporary consumer. It verified
  version/help, a complete mocked capture, four GET-only requests, token
  isolation, quoted-secret removal, valid JSON, and archive mode `0600`.

## Public installation and release identity

A clean GitHub CLI 2.98.0 environment, isolated with fresh `GH_CONFIG_DIR` and
`XDG_DATA_HOME`, successfully ran:

```sh
gh extension install B-Divyesh/gh-outage-witness
gh extension list
gh outage-witness --version
gh outage-witness --help
```

GitHub CLI reported `B-Divyesh/gh-outage-witness v0.1.1`; the documented help
and exit codes were present. The installed executable was 4,633,856 bytes and
had SHA-256 `2e3353...635469`, exactly matching the clean candidate build and
the raw `v0.1.1` release asset. The public repository is available without
authentication, is MIT licensed, and its `main` branch resolves to the tested
candidate. The release tag resolves to product commit `1244751`; candidate
`5c44472` adds verification/deployment records and does not change the shipped
binary.

The published tar archive SHA-256 was
`3a66249bcef2e8681b75378b2747bccf5fec276b70c41672265841bcb496e828`.
Its binary, README, and LICENSE were byte-identical to a fresh pack.

## CLI end-to-end evidence

### Real public Actions run

The installed release captured public run `actions/checkout#32904951246`
without a token.

- Run, one job, attempt lineage, and timestamped GitHub Status were collected.
- GitHub denied the log archive with 403. This was recorded as `unavailable`
  with the exact reason rather than guessed or omitted.
- `--strict --json` returned exit 5, printed valid structured JSON, and still
  wrote a valid 6,394-byte `0600` partial bundle.
- The manifest labeled the result `inconclusive` with low confidence, included
  observation times, and stated the uncertainty of the after-the-fact status
  observation.

### Normal, boundary, invalid, privacy, and recovery paths

- A packaged mocked capture returned exit 0 with `partial: false` and an empty
  jobs list. `--no-logs` was represented as `not-requested`.
- A local runner diagnostic containing `self-hosted runner lost communication`
  produced `runner-failure` with medium confidence.
- `PASSWORD="correct horse battery staple"`, `TOKEN=singleword`, a bearer
  authorization value, and a configured `customer_991` match were completely
  absent from the bundle. The redaction report counted four replacements and
  did not contain removed values.
- API requests carried the configured bearer token; the separate GitHub Status
  request carried no authorization header. All observed CLI requests were GET
  with user agent `ci-outage-witness/0.1.1`.
- No arguments, malformed repository, run ID 0, and invalid custom regex each
  returned exit 2 with specific guidance.
- Boundary run ID `u64::MAX` returned exit 3 for a 404 run and wrote no bundle.
- An existing output without `--force` returned exit 4 and retained its exact
  prior hash. Repeating with `--force` returned exit 0 and changed a deliberately
  loosened `0644` file back to `0600`.
- A missing optional runner file produced a `0600` partial bundle; `--strict`
  returned exit 5 and the manifest named the missing path/error.
- The help/version interfaces work non-interactively and documented exit codes
  0, 2, 3, 4, and 5 all matched observed behavior.

The artifact is a local CLI rather than a backend: server concurrency,
server-side persistence, and health/build identity checks are not applicable.
The only persistence is the explicitly requested ZIP, with overwrite refusal
and owner-only permissions verified above.

## Live deployment identity and browser QA

The live root and 19 other deployable files were byte-for-byte identical to
the clean candidate build: all HTML pages, JS, CSS, source maps, two fonts,
three WebPs, SVG, robots, sitemap, and service worker. Root HTML SHA-256 was
`7e3a330ce2cc6de06caa63b57cc2de5afb9189b0f6beed514205af6d02009496`.
This establishes candidate identity even though the host exposes no commit
header.

Fresh checks covered 1440x1000 desktop and 390x844 mobile, light and dark
treatments, keyboard-only use, and reduced motion.

- Root returned 200 with the expected title, `lang=en`, exactly one h1 and
  main, complete image alternatives, 17px desktop/16px mobile body text, and no
  page overflow.
- The skip link was first in the tab order. Navigation, scenario select,
  build/reset actions, both command scrollers, copy buttons, and footer links
  were reachable. Settled focus styling was a visible 3px cobalt ring in both
  themes. The demo built results and reset without a mouse.
- Axe found zero violations of any impact on root at both viewports; therefore
  serious/critical findings were zero. Privacy and terms also had zero
  serious/critical findings. Every visible link, button, and select was at
  least 44x44 CSS px.
- Root, privacy, and terms produced no console errors or page exceptions. A
  missing route returned the custom semantic page with HTTP 404.
- Reduced motion changed the hero animation to 0.01ms/one iteration and smooth
  scrolling to `auto`.
- Visual inspection of fresh screenshots found the intended glacial ceramic
  system intact, legible, stacked correctly at 390px, and free of clipping.
- `/opt/fleet/lib/verify-url.sh` returned HTTP 200 in 845ms, with title/lang,
  one h1, main, all image alternatives, labeled buttons, and zero console
  errors.

## Privacy, requests, policies, caching, and offline behavior

- Browser runtime traffic was same-origin GET/HEAD only: root, hashed CSS/JS,
  responsive hero, two self-hosted fonts, and the connectivity probe.
- Browser cookies, `localStorage`, and `sessionStorage` were empty. Source and
  runtime inspection found no analytics, telemetry, advertising, forms,
  fingerprinting, third-party scripts/fonts, or mutation requests.
- The privacy page accurately discloses the same-origin service-worker cache.
- CSP limits default, image, font, style, script, and connection sources to
  self; objects and framing are denied. HSTS, `nosniff`, same-origin COOP,
  no-referrer, and restrictive camera/microphone/geolocation policy were
  present on tested responses.
- HTML, 404, and `sw.js` use `public, must-revalidate, max-age=30`; hashed
  assets and WebPs use `public, max-age=31536000, immutable`. ETag conditional
  requests returned 304 with zero-byte bodies. HTTP redirects to HTTPS.
- Service-worker update succeeded. Cache `ci-outage-witness-v3` held the shell,
  a true offline reload rendered the complete documentation, and the explicit
  offline state appeared without page or console errors.

## Performance and bundle budgets

Production assets are within every static budget:

- JavaScript: 4,802 bytes (budget 200 KiB).
- CSS: 14,417 bytes (budget 50 KiB).
- Fonts: 63,068 bytes total (budget 120 KiB).
- Mobile hero: 15,864 bytes; largest hero: 53,122 bytes (budget 300 KiB).
- Lighthouse transfer: approximately 89.9 KB across 8 requests.

Four fresh simulated-mobile Lighthouse runs scored performance
`89, 100, 97, 98`; the repeat-set median was 98 and all three repeat runs met
the >=90 gate. The first run was a synthetic CPU outlier (430ms TBT) despite
the identical 4.8KB script. Across the repeat set: FCP 1.20–1.38s, LCP
1.38–1.46s, TBT 43.5–184.5ms, CLS 0.0006, and Speed Index 1.20–1.38s.
Accessibility, best practices, and SEO were 100 in every recorded run.
Synthetic INP was not available; the repeat TBT range stayed below 200ms.

## Disposition and known limits

Candidate `5c4447209f45b9b89daf5d7a003b9389631eae1a` is suitable for release.
No code changes are required from this verification.

Non-blocking product limits remain clearly documented: the published native
asset targets Linux amd64, and pattern-based redaction cannot guarantee removal
of an arbitrary secret embedded in unstructured prose. Maintainers are told to
review bundles before sharing. Synthetic Lighthouse scores exhibit host-noise
variance, but repeated measurements and all direct bundle metrics meet the
contract.
