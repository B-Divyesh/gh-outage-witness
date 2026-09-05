# Bundled demo incident

This sample describes a three-attempt deployment run with an 18-minute queue
wait, unavailable Actions logs, a healthy attached runner journal, and a public
Actions degradation observed two minutes after the run ended.

`runner-journal.txt` is stored as `runner/runner-journal.log` in the output.
`gh-outage-witness --demo` embeds these files, writes a new bundle under the
operating system's temporary directory, and redacts the sample credentials and
customer identifier. It does not use GitHub credentials or make network calls.
