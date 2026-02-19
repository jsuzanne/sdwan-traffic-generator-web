FROM debian:12-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ⚠️ À adapter avec la bonne URL de binaire xfr pour Linux amd64
RUN curl -L -o /usr/local/bin/xfr https://github.com/lance0/xfr/releases/latest/download/xfr-linux-amd64 \
  && chmod +x /usr/local/bin/xfr

ENV XFR_PORT=9000
ENV XFR_MAX_DURATION=60
ENV XFR_RATE_LIMIT=2
ENV XFR_PSK=""
ENV XFR_ALLOW_CIDR="0.0.0.0/0"
ENV XFR_DENY_CIDR=""

CMD ["/bin/sh", "-c", "\
  echo \"[xfr-target] Starting xfr server on port ${XFR_PORT}...\" >&2; \
  xfr serve -p ${XFR_PORT} \
    --max-duration ${XFR_MAX_DURATION}s \
    --rate-limit ${XFR_RATE_LIMIT} \
    ${XFR_PSK:+--psk ${XFR_PSK}} \
    ${XFR_ALLOW_CIDR:+--allow ${XFR_ALLOW_CIDR}} \
    ${XFR_DENY_CIDR:+--deny ${XFR_DENY_CIDR}} \
    --no-tui \
"]

