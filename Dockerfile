# blind_pin_server publishes no tags or releases, so the build pins an immutable
# upstream commit. Bump BLIND_PIN_SERVER_REF to update — see UPDATING.md.
FROM debian:trixie-slim@sha256:3a39a0592364683e6bab97937b72cad5a8fa6dcbbee90edb3bb48c7f8e94f258

# Ahead of the commit Jade 1.0.40 pins: the newer ones move upstream to Debian
# trixie and Python 3.13, which is what the hash-pinned wheels here resolve for.
ARG BLIND_PIN_SERVER_REF=22607096cc0f0c703b355cf2886511d354a8b994

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates git python3 python3-pip uwsgi uwsgi-plugin-python3 \
 && rm -rf /var/lib/apt/lists/*

# Upstream's modules import each other relatively, so the source tree itself is
# the `pinserver` package and has to sit under that name on PYTHONPATH.
WORKDIR /app/pinserver
RUN git init -q . \
 && git remote add origin https://github.com/Blockstream/blind_pin_server.git \
 && git fetch --depth 1 -q origin ${BLIND_PIN_SERVER_REF} \
 && git checkout -q --detach FETCH_HEAD \
 && rm -rf .git \
 && pip install --no-cache-dir --break-system-packages --require-hashes \
      -r requirements.txt \
 && apt-get purge -y --auto-remove git python3-pip \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1

# Every path the app touches is relative to the working directory; the StartOS
# volume mounts here.
WORKDIR /data
