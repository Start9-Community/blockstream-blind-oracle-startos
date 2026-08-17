<p align="center">
  <img src="icon.svg" alt="Blockstream Blind Oracle Logo" width="21%">
</p>

# Blockstream Blind Oracle on StartOS

> Everything not listed in this document should behave the same as the upstream
> blind PIN server. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

The blind PIN oracle is the server a [Blockstream Jade](https://github.com/Blockstream/Jade) talks to when it unlocks with a PIN. It helps the device decrypt its stored seed and destroys the record after three wrong PINs, without ever learning the PIN, the seed, or the keys. This package runs [that oracle](https://github.com/Blockstream/blind_pin_server) yourself instead of relying on Blockstream's.

- **Upstream repo:** <https://github.com/Blockstream/blind_pin_server>
- **Wrapper repo:** <https://github.com/Start9-Community/blockstream-blind-oracle-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, built here from a digest-pinned Debian base. Upstream publishes no releases or tags, so the build pins an immutable upstream commit through a build argument — the procedure is in `UPDATING.md`.

| Property      | Value                                           |
| ------------- | ----------------------------------------------- |
| Image         | Built from this repo's `Dockerfile`             |
| Architectures | x86_64, aarch64                                 |
| Command       | `uwsgi`, in HTTP mode — the image declares none |

| Subcontainer          | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `pinserver-sub`       | The oneshot and the daemon — the one to `attach` to   |
| `generate-server-key` | Temporary, init only: generates the oracle's key pair |

**This runs uWSGI alone, where upstream's image supervises nginx and uWSGI under runit.** nginx's job upstream is translating HTTP into the uWSGI protocol at the edge, which is redundant here — StartOS already terminates TLS and proxies plain HTTP into the container, and uWSGI speaks HTTP natively. What dropping it costs is under [Limitations](#limitations-and-differences). With a single process there is nothing to supervise, so runit goes too and SIGTERM reaches the server directly.

**Exactly one worker process, with four threads.** Protocol v1 handshake sessions live in worker memory, so a second _process_ would miss the handshake a subsequent request refers to; threads share it. uWSGI starts as root and drops to `www-data` itself, matching upstream's own configuration.

## Volume and Data Layout

One volume, and it is also the daemon's working directory — which is not decoration. Every path the application touches is resolved relative to the working directory, so the mount point and `--chdir` are the same value by necessity.

| Volume | Mount Point | Purpose                                    |
| ------ | ----------- | ------------------------------------------ |
| `main` | `/data`     | The oracle's key pair and every stored PIN |

| Path                     | Holds                                                |
| ------------------------ | ---------------------------------------------------- |
| `server_private_key.key` | The oracle's static EC private key, mode `0600`      |
| `server_public_key.pub`  | The matching public key — 33 **raw bytes**, not text |
| `pins/<hash>.pin`        | One encrypted blob per enrolled client key           |

The service refuses to start if the private key or `pins/` is missing.

**Both artifacts are irreplaceable.** Every stored blob is encrypted under a key derived from the private key, so losing either the key or the blobs means every Jade enrolled here can no longer be unlocked by PIN and must be restored from its recovery phrase. There is no rotation and no rebuild.

## File Models

None. There is no configuration file this package owns, seeds, or rewrites, and no `store.json`.

Everything on the volume is written by the application itself or by the init step that generates the key pair. The two upstream settings that exist — the handshake session lifetime and the choice of storage backend — are left at their defaults and are not exposed, which means the filesystem backend is in use.

## Dependencies

None.

## Network Access and Interfaces

One interface, and it is an API rather than a UI — there is no browser interface, so the address is offered for copying rather than as a launch button.

| Interface  | Id       | Type | Port | Description                                     |
| ---------- | -------- | ---- | ---- | ----------------------------------------------- |
| Oracle API | `oracle` | api  | 8096 | Where a Jade's companion app sends PIN requests |

Bound on the `oracle-multi` MultiHost over HTTP and not masked. The container speaks plain HTTP; StartOS terminates TLS in front of it.

**Which address you give the Jade is the significant decision here**, and the reason enrollment is an action rather than something the interface can compose. See [Actions](#actions).

**The API is unauthenticated**, as upstream — it is designed to be safe against its callers rather than to identify them. Combined with the loss of request buffering (see [Limitations](#limitations-and-differences)), the practical advice is to keep the address private rather than publish it broadly.

## Installation and First-Run Flow

Upstream expects an operator to generate a key pair by hand and mount it in. This package does it, and does it once.

1. **Init generates the key pair** by running upstream's own generator in a temporary container, then tightens the private key to `0600`.
2. **A oneshot prepares the volume** — creating `pins/` and giving the whole directory to `www-data` — before the daemon starts.

**Generation is keyed on the key files existing, not on whether this is an install.** A key restored from a backup must survive, because regenerating it would orphan every Jade already enrolled. Both halves are required, so an interrupted generation is retried rather than left half-written.

There is no admin account, no password, and no install task. Enrolling a Jade is a manual, user-paced procedure — and one with a serious prerequisite, since a Jade that already holds a wallet must be factory reset before its oracle can be changed. That warning lives in `instructions.md`, where the user reads it.

## Actions

One action, and it is the whole of enrollment.

### Show Oracle Details

Returns the code a Jade scans to trust this oracle, plus the public key for setting it up over USB instead. Run it when enrolling a device, and again if you want to move a Jade to a different address.

- **When to run it:** any status — both values are readable while the service is stopped.
- **What it changes:** nothing on the server. It composes a payload from the addresses you pick.
- **Repeat safety:** read-only and freely repeatable.
- **Input:** which addresses to write, capped at the two slots a Jade holds and **empty by default**. The default is deliberate: enrolling an address exposes or publishes it, differently depending on which, so the choice is never made silently.
- **Outputs:** the enrollment string — drawn as a QR when it will scan — and the public key as hex.

**The two slots are clearnet and onion, not primary and fallback.** A Jade never opens a socket itself; it hands both URLs to the companion app, which makes the request. So a public domain belongs in the first slot and a Tor address in the second, which is the order the action produces. Selecting only one writes an empty second slot, which the device reads as "explicitly none" — it does **not** fall back to Blockstream's default.

**Some addresses cannot be scanned, and the action says so.** An address served with this server's own certificate needs that certificate embedded in the payload, and the result is denser than a Jade's camera can resolve at any size. Those are labelled in the picker and, if selected, produce copyable text with no code — set them up over USB instead. A Tor address or an ACME-issued public domain needs no certificate and scans fine.

**A certificate, once sent, is never cleared.** The device stores it separately from the URLs, so re-enrolling to a Tor-only address leaves the old root on the Jade. It is inert there, since the onion leg uses no TLS, but it is not removed.

## Tasks

None. This package raises no tasks, so the service is never held on a prompt and its ordinary controls are always available.

## Health Checks

One check, on the only daemon.

| Check     | Displayed as | Method                            | Grace Period |
| --------- | ------------ | --------------------------------- | ------------ |
| `primary` | "Oracle API" | HTTP request to the local address | default      |

It fetches rather than probing the port, so it exercises the WSGI app and its worker rather than just the bound socket. The limit worth knowing: **any** HTTP response counts as success, so it catches an unreachable or wedged worker but not one returning errors.

Upstream's dedicated health route is served by nginx, which this package does not run; the check uses upstream's own root route instead.

## Backups and Restore

The whole `main` volume is copied, with no exclusions — `sdk.Backups.ofVolumes('main')`.

**This backup is the difference between a recoverable Jade and a recovery-phrase restore.** It holds the private key every stored blob is encrypted under, and the blobs themselves. Lose both and every enrolled device falls back to its recovery phrase; keep them and a restore returns the same oracle, with enrolled devices continuing to work untouched.

Init will not regenerate over a restored key pair, so a restore needs nothing done to it. Devices do not need re-enrolling unless the oracle's _address_ has changed.

## Limitations and Differences

1. **No nginx, which costs three things**: upstream's dedicated health route, the permissive CORS headers it set, and request-body buffering. Without a buffering proxy, uWSGI reads request bodies itself, so a slow or stalled client occupies a request slot — four threads blunt that, but a caller who can reach the address can still degrade availability. Keep the address private.
2. **The Redis storage backend is not wired up.** The filesystem backend is used.
3. **One worker process**, so protocol v1 handshake state is not shared beyond it.
4. **The handshake session lifetime is not configurable** and is left at upstream's default.
5. **The API is unauthenticated**, as upstream.
6. **There is no key rotation, deliberately.** The storage key is derived from the server private key, so rotating it would make every stored blob undecryptable.
7. **An address served with this server's own certificate cannot be enrolled by QR** — only over USB.

---

## Quick Reference for AI Consumers

```yaml
package_id: blockstream-blind-oracle
image: built from ./Dockerfile # upstream pinned by commit, no releases exist
architectures:
  - x86_64
  - aarch64
subcontainers:
  - pinserver-sub # the oneshot and the daemon
  - generate-server-key # temporary, init only
volumes:
  main: /data # also the daemon's working directory
file_models: []
startos_managed_env_vars: [] # PYTHONPATH and PYTHONUNBUFFERED are set in the image
dependencies: []
interfaces:
  oracle: { type: api, port: 8096 }
actions:
  - show-oracle-details
tasks: []
health_checks:
  - primary # displayed "Oracle API"
```
