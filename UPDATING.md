# Updating the upstream version

## Determining the upstream version

[blind_pin_server](https://github.com/Blockstream/blind_pin_server) publishes **no releases and no tags**, and carries no version string of its own. "Latest" means the newest suitable commit on `master`:

```sh
git ls-remote https://github.com/Blockstream/blind_pin_server.git refs/heads/master
```

The pin lives in the root `Dockerfile` at `ARG BLIND_PIN_SERVER_REF`. There is no `dockerTag` — the image is built from source (`source: { dockerBuild: {} }` in `startos/manifest/index.ts`).

Blockstream's Jade firmware vendors this repo as a submodule at `pinserver/`, so each firmware release pins an exact commit. That pin is the best available compatibility signal — it is the oracle a given firmware was tested against. Jade publishes git tags but no GitHub releases, so list tags rather than reaching for `gh release`, and skip prereleases such as `1.0.39-beta2`:

```sh
gh api repos/Blockstream/Jade/tags --jq '.[].name'
gh api repos/Blockstream/Jade/contents/pinserver?ref=<jade-tag> --jq .sha
```

Prefer a commit at or below the one pinned by the newest Jade firmware release unless there is a specific reason to move ahead of it. **The current pin is deliberately ahead** of Jade `1.0.41`'s (`22607096`): the later commits are server-side security fixes and a libwally update. They leave the wire protocol and the stored record format unchanged; the one stricter rule they add, a v2 `get_pin` counter above the `set_pin` one, is what Jade's never-reset, per-request counter (`storage_get_replay_counter` in Jade's `main/storage.c`) already sends.

## Applying the bump

1. Set `BLIND_PIN_SERVER_REF` in the `Dockerfile` to the new commit SHA.
2. Read the diff between the old and new pins — <https://github.com/Blockstream/blind_pin_server/compare/OLD...NEW>. Pay attention to `requirements.txt` (the Python dependency set is hash-pinned and installed verbatim), `flaskserver.py` (routes), and `wsgi.ini` (upstream's own serving assumptions, which this package deliberately does not use).
3. Confirm every pinned wheel still resolves for **cp313 on both `x86_64` and `aarch64`** — `--require-hashes` means a dependency without a matching wheel for an arch fails the build on that arch. `make` builds both.
4. In `startos/versions/current.ts`, keep the `0.1.0` component fixed: it is a packaging version, not an upstream one, so only the revision moves until upstream starts tagging.

The Debian base image is also digest-pinned in the `Dockerfile`. Refresh it on its own schedule with `docker buildx imagetools inspect debian:trixie-slim`, which is a separate change from an upstream bump.
