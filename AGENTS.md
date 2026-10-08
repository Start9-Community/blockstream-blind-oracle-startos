# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes. This file restates neither:
whoever changes the package has both, so it carries only what they don't — repo mechanics,
a change that looks right and is not, where the next thing gets added, a naming trap, a
build or test invocation particular to this repo.

**Fix a defect you spot rather than reporting it** — you have the package open and the
context to be sure. File **a GitHub issue on this repo** only when the call isn't yours to
make: you can't pin the cause down, two defensible fixes exist, or it's too large to ride on
the work in hand. An open issue is a report, not a queue — implement one when you're asked
to or when it's labelled `Approved`, then close it with `Closes #<n>`.

Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **Do not raise `--processes` above 1** — protocol v1 keeps handshake sessions in worker memory, so a second process misses the handshake a later `get_pin` refers to; `--threads` share it and are safe.
- **Never add a key-rotation action** — the storage key is derived from the server private key (`_get_aes_pin_data_key` in upstream's `pindb.py`), so rotating it makes every stored `.pin` blob undecryptable.
- **Verify any edit to `oracleQr.ts` against a known-good encoder, never by eye** — it is the `ur:jade-updps` wire format fixed by Jade's `main/process/update_pinserver.c`, and a wrong CBOR shape, CRC or bytewords table yields a QR the device rejects ([SimpleJadePinServer](https://github.com/Filiprogrammer/SimpleJadePinServer)'s `oracle_qr.html` is byte-identical).
- **Don't move enrollment onto the interface** — the address is a field inside a checksummed, bytewords-encoded CBOR map, which no scheme/host/path/query decomposition produces.
- **Smoke-test the image outside StartOS** when changing the Dockerfile or the uwsgi
  invocation:

  ```sh
  docker build -t jade-oracle .
  docker run --rm -v "$PWD/vol:/data" jade-oracle python3 -m pinserver.generateserverkey
  docker run --rm -d -p 127.0.0.1:8096:8096 -v "$PWD/vol:/data" jade-oracle \
    uwsgi --plugin python3 --http-socket 0.0.0.0:8096 --module pinserver.wsgi:app \
          --chdir /data --pythonpath /app --master --processes 1 --need-app --die-on-term
  ```
