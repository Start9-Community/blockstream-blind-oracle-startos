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

Prefer a commit at or below the one pinned by the newest Jade firmware release unless there is a specific reason to move ahead of it. **The current pin is deliberately ahead** of Jade `1.0.40`'s (`d2748959`): the three later commits move upstream to Debian trixie and Python 3.13, which is what this image's hash-pinned wheels resolve for. They change dependencies and packaging only, not the wire protocol.

## Applying the bump

1. Set `BLIND_PIN_SERVER_REF` in the `Dockerfile` to the new commit SHA.
2. Read the diff between the old and new pins — <https://github.com/Blockstream/blind_pin_server/compare/OLD...NEW>. Pay attention to `requirements.txt` (the Python dependency set is hash-pinned and installed verbatim), `flaskserver.py` (routes), and `wsgi.ini` (upstream's own serving assumptions, which this package deliberately does not use).
3. Confirm every pinned wheel still resolves for **cp313 on both `x86_64` and `aarch64`** — `--require-hashes` means a dependency without a matching wheel for an arch fails the build on that arch. `make` builds both.
4. Bump the `:N` revision in `startos/versions/current.ts` and write release notes in every locale. Keep the `0.1.0` component fixed: it is a packaging version, not an upstream one, so only the revision moves until upstream starts tagging.
5. Run `make` and verify both s9pks build.

The Debian base image is also digest-pinned in the `Dockerfile`. Refresh it on its own schedule with `docker buildx imagetools inspect debian:trixie-slim`, which is a separate change from an upstream bump.
