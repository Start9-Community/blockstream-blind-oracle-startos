<p align="center">
  <img src="icon.svg" alt="Blockstream Blind Oracle Logo" width="21%">
</p>

# Blockstream Blind Oracle on StartOS

> **Upstream repo:** <https://github.com/Blockstream/blind_pin_server>
>
> Everything not listed in this document should behave the same as the upstream
> blind PIN server. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable.

The blind PIN oracle is the server a [Blockstream Jade](https://github.com/Blockstream/Jade) talks to when it unlocks with a PIN. It helps the Jade decrypt its stored seed and destroys the record after three wrong PINs, without ever learning the PIN, the seed, or the keys. This package lets you run that oracle yourself instead of relying on Blockstream's.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

|                | |
| -------------- | --- |
| Image source   | Custom `Dockerfile` in this repo, built from a digest-pinned Debian slim base |
| Architectures  | `x86_64`, `aarch64` |
| Entrypoint     | Custom — the image declares no `CMD`; `startos/main.ts` owns the argv |

Upstream publishes no releases or tags, so the build pins an immutable upstream commit through the `BLIND_PIN_SERVER_REF` build argument. See [UPDATING.md](UPDATING.md).

The upstream image supervises **nginx + uWSGI** under **runit**. This package runs **uWSGI alone**, in HTTP mode:

- nginx's main job upstream is translating HTTP into the uWSGI protocol at the edge, which is redundant here: StartOS already terminates TLS and proxies plain HTTP into the container, and uWSGI speaks HTTP natively. It also set permissive CORS headers and buffered request bodies — see [Limitations](#limitations-and-differences) for what dropping it costs.
- With a single process there is nothing to supervise, so runit is dropped and SIGTERM reaches the server directly.

uWSGI starts as root and drops to `www-data` itself, matching upstream's `wsgi.ini`. It runs **exactly one worker process**, with four threads: protocol v1 handshake sessions are held in worker memory, so a second *process* would miss the handshake that a subsequent `get_pin` refers to, while threads share it.

Upstream's Python source tree *is* the `pinserver` package — its modules import each other relatively — so it is checked out to `/app/pinserver`, with `/app` on `PYTHONPATH`.

## Volume and Data Layout

| Path | Contents |
| ---- | -------- |
| `/data` | The `main` volume, and the daemon's working directory |
| `/data/server_private_key.key` | The oracle's static EC private key, mode `0600` |
| `/data/server_public_key.pub` | The matching public key — 33 raw bytes, a compressed EC point |
| `/data/pins/<hash>.pin` | One encrypted blob per enrolled client key |

Every path the application touches is resolved **relative to the working directory**, which is why the volume is mounted at the daemon's `--chdir`. The service refuses to start if either `server_private_key.key` or `pins/` is missing.

There is no `store.json` and no file model — all state is written by the application itself.

## Installation and First-Run Flow

Upstream expects the operator to generate a key pair by hand and bind-mount it. This package does that for you:

1. On init, `startos/init/generateServerKey.ts` runs upstream's own `generateserverkey` module in a temporary container, writing the key pair to the volume, then tightens the private key to `0600`. Generation is keyed on both key files already existing rather than on the init kind, so a key restored from backup is never overwritten — `restoreInit` runs first and populates the volume before this check. Requiring both halves means an interrupted generation is retried rather than left half-written.
2. A `prepare-data` oneshot creates `pins/` and chowns the volume to `www-data` before the daemon starts.

Nothing else is pre-configured, and there is no admin account or password. Enrolling a Jade is a manual, user-paced procedure documented in `instructions.md`, so the package raises no install task for it.

## Configuration Management

| StartOS-Managed | Upstream-Managed |
| --------------- | ---------------- |
| Bind address and port, working directory, `PYTHONPATH`, worker count, process user | `SESSION_LIFETIME` (handshake expiry) and `REDIS_HOST` (storage backend) |

Neither upstream setting is currently exposed; both are left at their upstream defaults, which means the filesystem storage backend is used.

## Network Access and Interfaces

| Interface | Port | Protocol | Purpose |
| --------- | ---- | -------- | ------- |
| `oracle`  | 8096 | HTTP     | `get_pin` / `set_pin` requests from a Jade companion app |

Declared as `type: 'api'` — there is no browser UI, so the interface offers its address for copying rather than a launch button. The container speaks plain HTTP and StartOS terminates TLS in front of it.

The bind requests no `preferredExternalPort`. The SDK derives an SSL leg for `http` and fixes its preference at the `https` default of 443 regardless of what the root asks for, so a root override would only ever move the plaintext port. Both values are preferences — StartOS assigns something else when the port is taken. Nothing in the oracle protocol depends on a particular external port, since the Jade is handed a whole URL, so neither is worth overriding.

## Actions (StartOS UI)

### Show Oracle Details

- **Purpose:** returns the enrollment QR a Jade scans, plus `server_public_key.pub` hex-encoded for Blockstream's USB tool.
- **Visibility:** enabled.
- **Availability:** any status — both values are readable while the service is stopped.
- **Inputs:** `urls`, a multiselect of every non-local address, capped at Jade's two slots and **empty by default** — enrolling an address publishes or exposes it differently depending on which one, so the choice is always the user's. Addresses needing a certificate are labelled as unscannable, since they can only be set up over USB. There is no `minLength`, so an empty selection still returns the public key.
- **Outputs:** a `ur:jade-updps` string, drawn as a QR when it fits (see `maxQrLength` below) and offered as copyable text either way, plus the 33-byte public key as 66 hex characters.

The key file holds raw bytes rather than text, so the action hex-encodes it for display.

#### The enrollment QR

Jade's **Boot Menu → Blind Oracle → Scan Oracle QR** reads a BC-UR-wrapped CBOR message, so `oracleQr.ts` builds one rather than depending on a library:

```
ur:jade-updps/<bytewords-minimal(cbor ‖ crc32(cbor))>   — uppercased
{ id: '001', method: 'update_pinserver',
  params: { urlA: <string>, urlB?: <string>, pubkey: <33 raw bytes>,
            certificate?: <PEM string> } }
```

`jade-updps` is the UR type Jade's scanner dispatches on (`main/qrmode.c`), and the params are what `main/process/update_pinserver.c` reads. Uppercasing keeps the payload in the QR's alphanumeric mode; Jade compares the type case-insensitively. Encoder output is byte-identical to [SimpleJadePinServer](https://github.com/Filiprogrammer/SimpleJadePinServer)'s `oracle_qr.html`, which is the same message Umbrel's blind oracle app emits.

Four constraints shape what the action emits:

- **`pubkey` requires `urlA`.** Jade rejects a key without at least one URL (`"Cannot set only second URL"`), so the action emits nothing until the host has an eligible address.
- **The two slots are clearnet and onion, not primary and fallback.** Jade never opens a socket itself: it answers `auth_user` with an `http_request` naming both URLs and the companion app performs the POST (`main/process/pinclient.c`). Slot A defaults to Blockstream's `https://j8d.io` and slot B to their onion, so the action puts an ACME domain in `urlA` and a Tor address in `urlB`. Omitting `urlB` writes an empty string, which `pinclient.c` reads as "explicitly no second url" — it does not restore Blockstream's default.
- **The interface cannot compose this, so it stays an action.** The lndconnect pattern — `schemeOverride` plus `query`, letting StartOS emit one connection string per address — works because an lndconnect URI *is* a URL: `addressHostToUrl` builds `scheme://user@host:port` plus a suffix, so the address is the authority and the secrets are query parameters. Here the address is a field inside a CBOR map that is then checksummed and bytewords-encoded, which no scheme/host/path/query decomposition can produce. Since the address is baked into the payload, the action takes it as input rather than choosing silently.
- **`certificate` is sent for any address the app would not otherwise trust.** Onions are plaintext (`ssl: false`, port 80) over an encrypted transport and ACME domains are publicly trusted, so both go out bare. Everything else — LAN IPs, the mDNS `.local` name, private domains — is served with this server's own CA, so the action fetches the root from `sdk.getSslCertificate(...)` (a `[leaf, int, root]` fullchain, per `FullchainCertData::fullchain_nistp256`) and embeds it. One certificate covers both slots: Jade stores it by a separate call from the URLs and attaches it to every request, where the onion leg simply ignores it.
- **`maxQrLength` is set by Jade's camera, not by what will encode.** It scans at 320×240 grayscale (`main/camera.c`), so the symbol has to resolve inside 240 pixels. Modules run `4·version + 17` plus an 8-module quiet zone, giving version 13 (796 alphanumeric characters) at a workable three pixels per module, and version 23 even at the two-pixel Nyquist floor. Past the cap the action drops the QR and offers the string as copyable text.

  A certificate cannot come in under it. StartOS's ECDSA root is 688 bytes, which bytewords doubles to 1376 characters; a LAN + onion + certificate payload lands at 1812 characters — version 29, 141 modules, **1.7 pixels per module**. Drawing it larger changes nothing, because the ceiling is how much sensor the symbol gets once it fills the frame. Neither reference implementation ships a certificate in a code, which is consistent with this: Umbrel provisions over Tor, and SimpleJadePinServer's form has no certificate field. Big payloads reach a Jade as *animated multi-part* URs (how it ingests PSBTs), which a single static action-result QR cannot express.
- **A certificate is never cleared.** Jade stores it independently of the URLs, so unlike `urlB` — which an omitted field blanks — an omitted `certificate` leaves whatever was there. Re-enrolling from a LAN address to a Tor-only one strands the old root on the device, where it is inert because the onion leg uses no TLS. Clearing it would mean sending `reset_certificate`, which is untested here.

## Backups and Restore

The whole `main` volume is backed up, with no exclusions. Both artifacts on it are irreplaceable:

- `server_private_key.key` — every stored blob is encrypted under a key derived from it.
- `pins/` — the per-client blobs themselves.

Losing either means every Jade enrolled with this oracle can no longer be unlocked by PIN, and must be restored from its recovery phrase instead. Restore returns the same key pair, so enrolled devices keep working, and init will not regenerate over it.

## Health Checks

|              | |
| ------------ | --- |
| Method       | HTTP `GET http://127.0.0.1:8096/` |
| Success      | "The oracle is answering requests" |
| Failure      | "The oracle is not answering requests" |
| Grace period | SDK default |

This fetches rather than checking that the port is open so the probe exercises the WSGI app and its worker, not just the bound socket. Note that `checkWebUrl` succeeds on any HTTP response, so it detects an unreachable or wedged worker but not one returning errors. Upstream's `/healthz` route is served by nginx, which this package does not run; `GET /` is upstream's own liveness route.

## Dependencies

None.

## Limitations and Differences

1. nginx is not run, which costs three things: upstream's `/healthz` route (`GET /` serves the same purpose), the permissive CORS headers upstream sets, and request-body buffering. Without a buffering proxy, uWSGI reads request bodies itself, so a slow or stalled client occupies a request slot — the worker runs four threads rather than one to blunt that, but a caller who can reach the address can still degrade availability. Treat the oracle address as private.
2. The Redis storage backend is not wired up; the filesystem backend is used.
3. A single worker process, so protocol v1 handshake state is not shared beyond it.
4. `SESSION_LIFETIME` is left at the upstream default and is not user-configurable.
5. As upstream, the API is unauthenticated — it is designed to be safe against its callers rather than to identify them.

## What Is Unchanged from Upstream

- The wire protocol, both v1 and v2, and all four routes (`GET /`, `POST /start_handshake`, `POST /get_pin`, `POST /set_pin`).
- The PIN logic, including the three-attempt limit and the anti-replay counter.
- The filesystem storage layout and the on-disk key formats.
- The Python dependency set, installed from upstream's hash-pinned `requirements.txt`.

## Contributing

Repo-specific context for contributors and coding agents lives in [AGENTS.md](AGENTS.md). Build and development workflow follow the StartOS packaging guide: <https://docs.start9.com/packaging>. Keep `README.md`, `instructions.md`, and `AGENTS.md` in sync with any change to user-visible behavior or package structure.

---

## Quick Reference for AI Consumers

```yaml
package_id: blockstream-blind-oracle
architectures: [x86_64, aarch64]
volumes:
  main: /data
ports:
  oracle: 8096
dependencies: none
startos_managed_env_vars:
  - PYTHONPATH
  - PYTHONUNBUFFERED
actions:
  - show-oracle-details
```
