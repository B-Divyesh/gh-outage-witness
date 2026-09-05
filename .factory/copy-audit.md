# Landing-page copy audit

Audited 5 September 2026. Word counts treat hyphenated terms and numbers as
one word. The visible landing-page sentences all use 22 words or fewer. No
banned plain-words term appears in visible copy.

| Section | Sentence | Words | Flag |
| --- | --- | ---: | --- |
| Offline state | You are offline. | 3 | None |
| Offline state | The site and sample still work. | 6 | None |
| Offline state | A real capture needs GitHub access. | 6 | None |
| First screen | Capture evidence for one failed Actions run | 7 | None |
| First screen | For maintainers investigating delayed, silent, or failed GitHub Actions runs before logs and status change. | 15 | None |
| First screen | Opens a saved incident with no setup. | 7 | None |
| Figure | Five observations grouped in one evidence bundle. | 7 | None |
| Problem | One run page can miss incident evidence | 7 | None |
| Problem | Queue delays disappear. | 3 | None |
| Problem | Logs can arrive late. | 4 | None |
| Problem | Runner journals live elsewhere. | 4 | None |
| Problem | Public status changes after the incident. | 6 | None |
| Sample | Inspect a populated incident sample | 5 | None |
| Sample | The CLI includes this three-attempt deployment incident. | 7 | None |
| Sample | It writes the sample bundle to a new temporary directory. | 10 | None |
| Terminal | Sample data only; no network request or GitHub credential was used. | 11 | None |
| Sample output | Medium confidence. | 2 | None |
| Sample output | The public status observation supports the label but does not prove root cause. | 13 | None |
| How it works | Collect and review the evidence | 5 | None |
| How it works | The bundle keeps observations separate from its cautious evidence label. | 10 | None |
| Step 1 | Pass its repository and positive Actions run ID to the CLI. | 11 | None |
| Step 2 | The CLI requests run details, jobs, attempts, logs, and current public status. | 13 | None |
| Step 3 | Check every file and the recorded uncertainty before sharing the ZIP. | 11 | None |
| Install | Install and capture an incident | 5 | None |
| Install | Install the GitHub CLI extension. | 6 | None |
| Install | Then pass a repository and run ID. | 8 | None |
| Install | Add `--runner-log journal.txt` only when you want to include a local runner file. | 13 | None |
| Limits | Know what the bundle cannot prove | 7 | None |
| Limits | An evidence label is not a verdict. | 7 | None |
| Limits | A status incident can support a platform label, but it cannot prove provider fault. | 14 | None |
| Limits | Redaction still needs review. | 4 | None |
| Limits | Known credential formats and configured matches are removed. | 8 | None |
| Limits | An unusual secret in prose can remain. | 7 | None |
| Limits | Missing sources stay visible. | 4 | None |
| Limits | The bundle records unavailable logs or status instead of guessing what happened. | 12 | None |
| Footer | Capture a redacted evidence bundle for one Actions run. | 9 | None |

## Interface labels and fragments

These are not sentences, but they were checked for clarity and banned words:
`GitHub CLI · local evidence bundle`, `Try it with sample data`, `Install the
CLI`, `Runs on your computer`, `Uses read-only GitHub access`, `Free under the
MIT License`, `Why collect a bundle`, `Bundled sample`, `How it works`,
`Choose one run`, `Collect available evidence`, `Review the redacted bundle`,
`Limits and privacy`, and the source-state labels in the sample output.

## Terminology

| Concept | Word used |
| --- | --- |
| The ZIP created by the CLI | bundle |
| One GitHub Actions execution | run |
| The cautious result | evidence label |
| The isolated browser example | sample |
| A local diagnostic input | runner file |
| Evidence that could not be obtained | unavailable |

Product-name uses of “Witness” refer only to **CI Outage Witness**. Output is
always called a **bundle**.
