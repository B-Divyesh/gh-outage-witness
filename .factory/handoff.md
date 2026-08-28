# CI Outage Witness verification handoff — FAIL

Candidate `2c173a130649cf2f8645736ea2bb95621d6e8173` was independently verified on
2026-08-28 against <https://ci-outage-witness.sociobot.in/>. **Do not release.**

The checkout installs, tests, builds, packages, and runs as a standalone binary.
The live site is a byte-for-byte deployment of the candidate `dist/site`, works
on desktop and 390px mobile, reloads offline, sends appropriate response/cache
policies, stays within the bundle budgets, and scored Lighthouse 90/100/100/100.

Release is blocked by four material defects:

1. **Critical:** the advertised
   `gh extension install B-Divyesh/ci-outage-witness` exits 1 because GitHub CLI
   requires extension repository names to start with `gh-`. The advertised
   source repository also returns 404 to unauthenticated users, so the public
   free/open-source install path does not exist.
2. **High:** built-in assignment redaction only partially removes a quoted
   multi-word value. `PASSWORD="correct horse battery staple"` becomes
   `PASSWORD=[REDACTED] horse battery staple"` in the bundle.
3. **High:** the outer incident ZIP is created mode `0644`; its internal entry
   modes of `0600` do not prevent other local users from reading the archive.
4. **High:** axe at 390px reports serious `scrollable-region-focusable`
   failures on both horizontally scrollable install/capture command elements.

One additional low-severity issue remains: the footer Terms link measures
43x44 CSS px, below the 44x44 target requirement.

## Verification commands

```sh
npm ci
cargo fmt --all -- --check
npm audit --audit-level=high
npm test
npm run build
cargo package --locked
npm run pack:cli
```

All commands above passed. `npm test` covered 6 Rust unit tests, 2 CLI tests, 1
doctest, Clippy with warnings denied, and 9 local Playwright tests. The exact
build produced `dist/site/` and the 4,633,584-byte release binary with SHA-256
`9e98840a8e25f229d35cf4a31d1a56110aaa8626504979bee87ba0a81ad453e7`.

Independent CLI checks used the packed binary in a fresh temporary consumer,
controlled HTTP witnesses, and real public GitHub Actions run
`actions/checkout#32904951246`. Normal, partial, strict, invalid-input, missing
run, redaction, output collision, and `--force` recovery paths were exercised.
Token isolation to the API host passed; the status host received no credential.

Full commands, exact browser/header/cache evidence, measured budgets, and defect
reproductions are in [verification.md](verification.md).

## Next steps

- Choose a GitHub CLI-compatible public repository/binary name and make the
  documented install/invocation work from a clean unauthenticated consumer.
- Redact complete quoted assignment values and add adversarial redaction tests.
- Create the outer ZIP with owner-only permissions on supported platforms.
- Make mobile command scrollers keyboard focusable and expand the Terms target.
- Add 390px axe and install-command smoke tests, then rerun verification.
