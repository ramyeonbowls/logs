# Go API runtime with SQLite persistence and OpenSSH SFTP client.
FROM golang:1.27-alpine AS builder

WORKDIR /app
ENV CGO_ENABLED=0
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -trimpath -ldflags="-s -w" -o /out/logpulse-server .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata wget openssh-client-default coreutils \
    && addgroup -S -g 1000 logpulse && adduser -S -u 1000 -G logpulse logpulse \
    && mkdir -p /app /app/data /tmp/logpulse-ssh \
    && chown -R logpulse:logpulse /app /tmp/logpulse-ssh
WORKDIR /app
COPY --from=builder /out/logpulse-server /app/logpulse-server

EXPOSE 8080
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV LOG_ALLOWED_ROOTS=/var/log,/app/data
USER logpulse:logpulse
ENTRYPOINT ["/app/logpulse-server"]
