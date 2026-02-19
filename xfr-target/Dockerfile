FROM debian:12-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        curl -L https://github.com/lance0/xfr/releases/download/v0.8.0/xfr-x86_64-unknown-linux-musl.tar.gz | tar xz -C /usr/local/bin xfr; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        curl -L https://github.com/lance0/xfr/releases/download/v0.8.0/xfr-aarch64-unknown-linux-gnu.tar.gz | tar xz -C /usr/local/bin xfr; \
    fi && chmod +x /usr/local/bin/xfr

ENV XFR_PORT=9000
ENV XFR_MAX_DURATION=60
ENV XFR_RATE_LIMIT=2
ENV XFR_ALLOW_CIDR="0.0.0.0/0"

CMD ["/bin/sh", "-c", "echo \"[xfr-target] Starting xfr server on port ${XFR_PORT}...\" >&2; \
  xfr serve \
  --port ${XFR_PORT} \
  --max-duration ${XFR_MAX_DURATION}s \
  --rate-limit ${XFR_RATE_LIMIT} \
  --allow ${XFR_ALLOW_CIDR}"]

