# CI Outage Witness repair 2 handoff — PASS

- Work order: `ci-outage-witness-repair-2`
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Demo URL: <https://ci-outage-witness.sociobot.in/demo>
- Last product implementation SHA: `70d51965be55fb1f7dbe2dd246f42ae996072318`
- Claims and verification base SHA: `fb933d61c93fd65e0d11166787c3dab6156e502b`
- Static site deployment: Azure Static Web App `sf-ci-outage-witness`, production
- Deployed site source SHA: `6d8f560ae664cf9d6bb34e00f6fa7bacbee9287c`

The site files did not change after the deployed site source SHA. Later commits
changed the live verifier, one CLI-only message, and claim coverage. The live
root and demo HTML are byte-identical to the final local build.

## What changed

- Added `gh-outage-witness --demo`. It embeds the realistic files under
  `examples/demo/`, creates a new temporary directory, writes a redacted bundle,
  and prints its path. It makes no network request and reads no GitHub token.
- Added `/demo` and `/demo/` as a labelled browser sandbox. It opens with a
  populated incident, uses only `demo:ci-outage-witness:scenario`, keeps its
  banner visible, resets to the original sample, and clears sample state when
  the user chooses **Start for real**.
- Rewrote the first screen around the job, audience, sample action, and three
  concrete facts. Removed metaphorical headings and standardized “bundle” as
  the output term.
- Added a terminal transcript produced by the real CLI demo.
- Added canonical, Open Graph, Twitter, favicon, and Apple touch metadata to
  every route. Added the product-derived 1200×630 social image.
- Added the standard Demo and Privacy navigation, complete footer links, Param
  Factory attribution, and version/build identity.
- Added `.factory/claims.json` with 20 public claims. Every claim has one tagged
  observable test using the CLI sample, local HTTP witness, clean consumer, or
  fresh browser sandbox.
- Added `.factory/demo.md`, `.factory/copy-audit.md`, and the 90-character
  verb-first catalog description. The catalog description is also copied to
  `/work/.evidence/catalog-description.txt`.
- Kept all fixes from earlier verification: extension naming, quoted-secret
  redaction, `0600` outer archives, focusable command scrollers, and 44 px
  targets. A final live check found and fixed one additional 40 px Demo link.

## Review findings disposition

| Finding | Result |
| --- | --- |
| R-001 claims registry missing | Resolved. Twenty declared claim commands pass from a clean clone. |
| R-002 no CLI sample flow | Resolved. `--demo` creates and reports a real redacted ZIP from bundled fixtures. |
| R-003 browser sample not isolated | Resolved. `/demo` is populated, labelled, resettable, and limited to a `demo:` key. |
| R-004 indirect first-screen copy | Resolved. The first screen names the job, maintainers, and sample action. The copy audit has no flags. |
| R-005 incomplete metadata and skeleton | Resolved. All routes have metadata, standard navigation/footer, attribution, and build identity. |
| V-001 extension naming | Still resolved. Binary and repository use `gh-outage-witness`; the package contract passes. |
| V-002 quoted secret leak | Still resolved. Unit, packaged-consumer, demo, and available-log tests pass. |
| V-003 outer ZIP permissions | Still resolved. Fresh demo and consumer bundles measure `0600`. |
| V-004 mobile command focus | Still resolved. Both command scrollers focus at 390 px and axe is clean. |
| V-005 Terms target size | Still resolved. Every visible link, button, and select is at least 44×44 px. |

## Verification

Final local gates at claims/verification SHA `fb933d6`:

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

Results:

- npm audit: zero vulnerabilities.
- Rust: 8 unit tests, 4 CLI integration tests, and 1 doctest passed.
- Clippy passed with `-D warnings`; rustfmt check passed.
- Package naming contract passed.
- Playwright: 24 tests passed, including desktop, 390 px phone, keyboard,
  reduced motion, dark mode, axe, sandbox, offline, and claim tests.
- Build produced `dist/site/` and `dist/cli/gh-outage-witness`.
- Cargo package contained 21 files and verified successfully.
- Packaged consumer verification passed with four GET requests, redaction,
  structured output, `0600` mode, and the bundled demo.
- Final Linux amd64 binary: 4,709,552 bytes; SHA-256
  `2043081b3c0a13965df1b974dad568736db1002968e9bed469efe78f65febe16`.
- Ready release archive: `dist/package/ci-outage-witness_0.1.2_linux_x86_64.tar.gz`,
  2,051,457 bytes; SHA-256
  `a774eb0f2e14b917e6e79ea5f3528466969d3ef2603d7519f2c69be076fa3463`.

Every command in `.factory/claims.json` was then run separately after `npm ci`
in a clean clone at `fb933d6`. All 20 passed. The log is
`/work/.evidence/repair-2/claims-clean-final.log`.

A token-free capture of public run `actions/checkout#32904951246` succeeded and
wrote a valid `0600` ZIP. Its JSON result is
`/work/.evidence/repair-2/real-cli-final.json`.

## Live checks

The durable static deployment completed successfully. No backend, database,
tenant state, process persistence, health endpoint, or server rate limit exists
for this static site plus local CLI.

- `/`, `/demo`, `/demo/`, `/privacy/`, and `/terms/` return HTTP 200.
- An unknown route returns the designed page with HTTP 404.
- Live root SHA-256 is
  `f5a87939f2ea3a3a206d02344c838997b25d3ac9560643c3aac47e1905cd28c4`,
  identical to `dist/site/index.html`.
- Live demo SHA-256 is
  `a226038aa18b647221d68676dfae0df9407ae56ae4846340663fe2b83038b328`,
  identical to `dist/site/demo/index.html`.
- `verify-url.sh` passed in 1,055 ms with no console errors.
- The product live verifier passed in fresh desktop and 390 px phone contexts:
  zero serious/critical axe findings, zero console errors, visible focus,
  44 px targets, legal routes, designed 404, and offline demo reload.
- Fresh live mobile Lighthouse: performance 100, accessibility 100, best
  practices 100, SEO 100, FCP 1.20 s, LCP 1.35 s, TBT 0 ms, CLS 0.0008.
- First load transferred 90,670 bytes. JavaScript is 4,932 bytes, CSS is
  17,111 bytes, fonts total 63,068 bytes, and the mobile hero is 15,864 bytes.
- Security headers include CSP, HSTS, `nosniff`, no-referrer, same-origin COOP,
  and restrictive camera, microphone, and geolocation policy.

Evidence is under `/work/.evidence/repair-2/`, including desktop and phone
screenshots, live verification output, Lighthouse JSON, and clean-claim logs.

## Known limits and next steps

- The public GitHub extension release remains `v0.1.1`. Policy prohibits this
  worker from publishing packages or releases. The repository `main` contains
  v0.1.2, and the verified release archive is ready for the factory operator to
  publish as `v0.1.2`.
- The prepared native release is Linux amd64. Other operating systems can build
  from Rust source until their release binaries are produced.
- Pattern redaction cannot identify every unusual secret in prose. The product
  tells users to inspect every file before sharing.
- Synthetic Lighthouse does not report INP without user interaction. Direct
  interaction tests passed, and total blocking time was 0 ms.
