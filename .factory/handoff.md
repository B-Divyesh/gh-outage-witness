# CI Outage Witness independent verification handoff — PASS

- Work order: `ci-outage-witness-verify-2`
- Candidate: `5c4447209f45b9b89daf5d7a003b9389631eae1a`
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Verified: 2026-08-28 UTC
- Verdict: **PASS**

Independent QA from a clean detached checkout found no critical, high, medium,
or low defects. No product code was modified. Full evidence is in
`.factory/verification-2.md`.

## What was verified

- Clean install, dependency audit, rustfmt, all tests, strict Clippy, exact
  production build, Cargo packaging, CLI packing, and clean-consumer package
  verification passed.
- GitHub CLI 2.98.0 installed `B-Divyesh/gh-outage-witness` in an isolated
  environment and ran the public `v0.1.1` extension. The installed binary was
  byte-identical to the candidate build and release asset.
- Real and mocked captures covered normal, partial, strict, invalid, boundary,
  collision, force-recovery, runner-diagnostic, redaction, permissions, JSON,
  and read-only network paths. Documented exit codes 0/2/3/4/5 matched.
- All five earlier verification defects are resolved: install naming works,
  quoted secrets are fully removed, ZIPs are `0600`, mobile command scrollers
  are focusable with zero axe findings, and all touch targets are >=44px.
- All 20 deployable live files matched the candidate build byte-for-byte.
  Desktop and 390px mobile passed keyboard, focus, light/dark, reduced-motion,
  axe, console, legal page, custom 404, same-origin request, privacy, header,
  caching, service-worker update, and true offline reload checks.
- Bundle budgets passed. Three repeated simulated-mobile Lighthouse runs scored
  100/97/98 performance with 100 accessibility/best-practices/SEO; an initial
  noisy run scored 89, and the complete four-run median was 97.5.

## Reproduce

```sh
npm ci
npm audit --audit-level=high
cargo fmt --all -- --check
npm test
npm run build
cargo package --locked --allow-dirty
npm run pack:cli
npm run verify:package
npm run verify:live -- https://ci-outage-witness.sociobot.in/
```

The clean release binary SHA-256 is
`2e3353b0190ff11768a177ce42b72f889dbf03b6b357930e4ccc6ee9ad635469`.
The live root HTML SHA-256 is
`7e3a330ce2cc6de06caa63b57cc2de5afb9189b0f6beed514205af6d02009496`.

## Known limits

- The published native extension asset is Linux amd64. Other operating systems
  require a source build until additional release assets exist.
- Pattern-based redaction cannot prove removal of arbitrary secrets in prose;
  the CLI and documentation require review before sharing.
- Synthetic Lighthouse does not report INP. Repeat TBT was 43.5–184.5ms, and
  direct static budgets all passed.

No release-blocking work remains. Registry publishing was not performed; the
factory owns registry credentials.
