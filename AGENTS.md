# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `jade-blind-oracle`.** It wraps Blockstream's [`blind_pin_server`](https://github.com/Blockstream/blind_pin_server) — the blind PIN oracle a Jade hardware wallet consults when unlocking with a PIN. One HTTP API on port 8096, one `main` volume, no dependencies.
- **Upstream has no tags or releases.** The build pins a commit SHA in `ARG BLIND_PIN_SERVER_REF` in the `Dockerfile`, and the manifest builds from source (`dockerBuild`) rather than pulling an image. See `UPDATING.md`.
- **The volume is the daemon's working directory.** Everything upstream touches — `server_private_key.key`, `server_public_key.pub`, `pins/` — is resolved relative to CWD, so the daemon runs with `--chdir /data`. Moving the mountpoint means moving `--chdir` with it.
- **Exactly one uWSGI worker process.** Protocol v1 keeps handshake sessions in worker memory (`sessions` is a closure in `flaskserver.flask_server`), so a second *process* would miss the handshake a subsequent `get_pin` refers to. Do not raise `--processes`; `--threads` is safe because threads share that closure.
- **The health check fetches `GET /` rather than checking the port**, so it exercises the WSGI app and its worker. `checkWebUrl` succeeds on any HTTP response, so it will not catch a worker returning errors.
- **Dropping nginx dropped its CORS headers and request buffering too**, not just `/healthz`. Without a buffering proxy a stalled client holds a request slot — that is why the worker runs threads. If you reintroduce a proxy, revisit the Limitations section of `README.md`.
- **Do not add a key-rotation action without reading `pindb.py` first.** The storage key is derived from the server private key (`_get_aes_pin_data_key` is `hmac_sha256(STATIC_SERVER_PRIVATE_KEY, b'pin_data')`), so rotating it makes every stored `.pin` blob undecryptable. It is deliberately not shipped.
- **`server_public_key.pub` holds 33 raw bytes**, a compressed EC point — not text. The `show-oracle-details` action hex-encodes it for display.

## Inspecting a running install

To run a command inside the service's container, use `start-cli package attach jade-blind-oracle -n pinserver-sub -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — here `pinserver-sub`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".

To smoke-test the image outside StartOS:

```sh
docker build -t jade-oracle .
docker run --rm -v "$PWD/vol:/data" jade-oracle python3 -m pinserver.generateserverkey
docker run --rm -d -p 8096:8096 -v "$PWD/vol:/data" jade-oracle \
  uwsgi --plugin python3 --http-socket 0.0.0.0:8096 --module pinserver.wsgi:app \
        --chdir /data --pythonpath /app --master --processes 1 --need-app --die-on-term
```
