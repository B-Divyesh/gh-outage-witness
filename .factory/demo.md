# Demo sandbox

## Browser demo

- URL: <https://ci-outage-witness.sociobot.in/demo/>
- Compatibility URL: `https://ci-outage-witness.sociobot.in/?demo=1`
- First action: select **Try it with sample data** on the landing page.
- Initial sample: run `44500807` in `sample-incidents/payments-api`, with three
  attempts, an 18-minute queue wait, unavailable Actions logs, one attached
  runner journal, and a timestamped public Actions degradation.
- Storage: only `localStorage["demo:ci-outage-witness:scenario"]` is used.
  The product has no real-data browser namespace. Tests still seed a
  `real:incident` sentinel and prove the demo never changes it.
- Reset: **Reset demo** removes the current demo key, restores the original
  platform sample, and writes only the restored value under the same `demo:`
  key.
- Leave: **Start for real** removes the demo key and opens the install section.

The banner stays visible while sample mode is open. No account, GitHub token,
or network request beyond the static product origin is required.

## CLI demo

Run:

```sh
gh-outage-witness --demo
```

When installed as a GitHub CLI extension, run:

```sh
gh outage-witness --demo
```

The executable loads `examples/demo/` from data embedded at build time. It
creates a uniquely named directory under the operating system's temporary
directory and writes `sample-incident.zip` there. The command prints the full
path. It does not read GitHub credentials or make network requests.

Each invocation creates a new directory, so reset means deleting the printed
directory or running the command again. The demo never reads or writes a real
incident bundle.
