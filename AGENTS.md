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
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The volume is the daemon's working directory.** Everything upstream touches resolves relative to CWD, so the daemon runs with `--chdir /data`. Moving the mountpoint means moving `--chdir` with it.
- **Do not raise `--processes` above 1.** Protocol v1 keeps handshake sessions in worker memory (`sessions` is a closure in `flaskserver.flask_server`), so a second process misses the handshake a subsequent `get_pin` refers to. `--threads` is safe because threads share that closure.
- **Dropping nginx dropped its CORS headers and request buffering too**, not just `/healthz`. Without a buffering proxy a stalled client holds a request slot — that is why the worker runs threads. Reintroducing a proxy means revisiting `README.md` § Limitations.
- **Never add a key-rotation action.** The storage key is derived from the server private key (`_get_aes_pin_data_key` is `hmac_sha256(STATIC_SERVER_PRIVATE_KEY, b'pin_data')`), so rotating it makes every stored `.pin` blob undecryptable. Read `pindb.py` before proposing anything that touches the key.
- **`server_public_key.pub` holds 33 raw bytes**, a compressed EC point — not text. The action hex-encodes it for display and embeds it raw in the enrollment payload.
- **`oracleQr.ts` is a wire format, not a formatting helper.** It emits the `ur:jade-updps` BC-UR/CBOR message Jade's **Scan Oracle QR** parses; the field names and the 33-byte pubkey length are fixed by Jade's `main/process/update_pinserver.c`. Changing the CBOR shape, the CRC, or the bytewords table silently produces a QR the device rejects — verify any edit against a known-good encoder ([SimpleJadePinServer](https://github.com/Filiprogrammer/SimpleJadePinServer)'s `oracle_qr.html` is byte-identical), never by eye.
- **Don't try to move enrollment onto the interface.** The lndconnect pattern works because an lndconnect URI _is_ a URL — scheme, authority, query. Here the address is a field inside a CBOR map that is then checksummed and bytewords-encoded, which no scheme/host/path/query decomposition produces.
- **Smoke-test the image outside StartOS** when changing the Dockerfile or the uwsgi
  invocation:

  ```sh
  docker build -t jade-oracle .
  docker run --rm -v "$PWD/vol:/data" jade-oracle python3 -m pinserver.generateserverkey
  docker run --rm -d -p 127.0.0.1:8096:8096 -v "$PWD/vol:/data" jade-oracle \
    uwsgi --plugin python3 --http-socket 0.0.0.0:8096 --module pinserver.wsgi:app \
          --chdir /data --pythonpath /app --master --processes 1 --need-app --die-on-term
  ```
