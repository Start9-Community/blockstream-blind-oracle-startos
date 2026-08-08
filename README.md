<p align="center">
  <img src="icon.svg" alt="Jade Blind Oracle Logo" width="21%">
</p>

# Jade Blind Oracle on StartOS

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
3. An *important* task prompts the user to read the public key out of the **Show Oracle Public Key** action.

Nothing else is pre-configured, and there is no admin account or password.

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

## Actions (StartOS UI)

### Show Oracle Public Key

- **Purpose:** reads `server_public_key.pub` off the volume and returns it hex-encoded, copyable and as a QR code.
- **Visibility:** enabled.
- **Availability:** any status — the key is readable while the service is stopped.
- **Inputs:** none.
- **Outputs:** the 33-byte public key as 66 hex characters.

The file holds raw bytes rather than text, so the action hex-encodes it for display.

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
package_id: jade-blind-oracle
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
