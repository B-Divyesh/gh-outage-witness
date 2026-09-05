# CI Outage Witness review handoff — FAIL

- Work order: `ci-outage-witness-review-1`
- Reviewed implementation: `12447513de03c62c1042d7edfb2ab655cfc5cee2`
- Documentation SHA: `205d8130114316293a9a5e9652e4413bf23b6aa6`
- Live URL: <https://ci-outage-witness.sociobot.in/>
- Verdict: **FAIL**

No product code was changed. Full evidence is in `.factory/review-1.md`.

## Verified

`npm ci`, audit, rustfmt, `npm test`, `npm run build`, Cargo packaging, CLI
packing, and clean-consumer package verification passed. The live root matches
the fresh built root byte-for-byte. Fresh desktop and 390px phone checks passed
console, axe serious/critical, keyboard/focus, touch targets, legal pages,
custom 404, privacy request behavior, service-worker update, and offline reload.

All five defects in the earlier failing verification remain resolved:
extension naming, quoted-secret redaction, output archive `0600`, focusable
mobile command scrollers, and the 44px Terms target.

## Remaining work

There are five current findings and 18 untested public claims:

1. Add `.factory/claims.json` and one observable sandbox test per retained
   public claim.
2. Implement/document a real CLI `--demo`/`demo` flow with bundled sample
   input and a landing-page recording of the actual binary.
3. Make `/demo` or `?demo=1` a labelled sample-data sandbox with first-screen
   sample action, persistent banner, Reset demo, Start for real, and separate
   demo storage namespace.
4. Replace metaphorical first-screen/section copy with the required plain job,
   audience, and first action; add the copy audit.
5. Complete canonical/OG/Twitter/Apple metadata and the standard header/footer
   skeleton.

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
/opt/fleet/lib/verify-url.sh https://ci-outage-witness.sociobot.in/ /work/.evidence/live-url
```

`gh-outage-witness --demo` currently fails with exit 2 because it is not
implemented. The local review image did not have `gh`, so external GitHub-CLI
extension installation was not repeated; the standalone release archive was
exercised in a clean consumer instead.
