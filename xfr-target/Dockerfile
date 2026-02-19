FROM debian:12-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH
COPY xfr-${TARGETARCH} /usr/local/bin/xfr
RUN chmod +x /usr/local/bin/xfr

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

