# CI Outage Witness verification 3 handoff — FAIL

- Work order: `ci-outage-witness-verify-3`
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Implementation reviewed: `70d51965be55fb1f7dbe2dd246f42ae996072318`
- Documentation SHA reviewed: `6442123f95571f87e219115a2aa1d8ac6dc05b4a`
- Full report: [`.factory/verification-3.md`](verification-3.md)
- Verdict: **FAIL — 2 findings, 0 untested claims**

## What was verified

- Opened the live product in fresh 1440×1000 desktop and 390×844 phone
  contexts. The job, maintainer audience, and sample action are visible before
  scrolling.
- Exercised the live sample, changed its scenario, reloaded it, reset it, and
  left demo mode. The `demo:` value changed as expected and a seeded real-data
  sentinel never changed.
- Checked keyboard use, focus, touch targets, light/dark treatments, reduced
  motion, all route titles, metadata, legal pages, links, privacy behavior,
  offline reload/update, and the designed HTTP 404.
- Compared 24 live files with a fresh local build; every served file matched.
- Ran the full documented gate and all 20 declared claim commands separately
  in a fresh clone at `6442123`. All declared commands passed.
- Extracted the v0.1.2 archive into a clean consumer directory and exercised
  help, version, offline demo, redaction, ZIP contents, permissions, a public
  GitHub capture, invalid inputs, boundary input, collision, strict partial,
  and force recovery.
- Installed from the public source with Cargo; v0.1.2 and its demo worked.
- Installed through the primary documented GitHub CLI command in a clean
  GitHub CLI configuration; it selected v0.1.1 and exposed the release defect.

## Findings

1. **High — public extension release is stale.** `gh extension install
   B-Divyesh/gh-outage-witness` installs v0.1.1, and `gh outage-witness --demo`
   exits 2. The advertised behavior exists in v0.1.2, but that GitHub release
   is not published. Publishing is reserved for the factory operator.
2. **Medium — demo banner is outside landmarks.** Axe reports the moderate
   `region` rule for `.demo-banner` at desktop and phone sizes. All serious and
   critical axe checks are clean.

## Passing evidence

- `npm test`: 8 Rust unit tests, 4 CLI integration tests, 1 doctest, strict
  Clippy, package contract, and 24 Playwright tests passed.
- `npm run build`, Cargo package verification, `npm run pack:cli`, and
  `npm run verify:package` passed.
- All 20 claim commands: passed separately; no claim was left untested.
- Fresh Lighthouse: 100 performance, accessibility, best practices, and SEO;
  FCP 1.2 s, LCP 1.4 s, TBT 0 ms, CLS 0.001, 89 KiB transferred.
- Candidate binary: 4,709,552 bytes, SHA-256
  `2043081b3c0a13965df1b974dad568736db1002968e9bed469efe78f65febe16`.
- Live root and demo SHA-256 match the fresh build:
  `f5a87939f2ea3a3a206d02344c838997b25d3ac9560643c3aac47e1905cd28c4`
  and `a226038aa18b647221d68676dfae0df9407ae56ae4846340663fe2b83038b328`.

Evidence is under `/work/.evidence/verify-3/`. The required report copy and
machine-readable verdict are `/work/.evidence/qa-report.md` and
`/work/.evidence/qa-result.json`.

## Next steps

1. Factory operator publishes the prepared v0.1.2 GitHub release.
2. Add a named landmark around the persistent demo controls and strengthen the
   demo axe assertion to reject all violations.
3. From a fresh GitHub CLI configuration, install the extension, confirm
   v0.1.2, run `gh outage-witness --demo`, then rerun all quality gates.

No product code was modified during verification.
