# Multi-stage Dockerfile for lightweight Go 1.25 LogPulse Backend
# Final image size: ~14 MB

FROM golang:1.25-alpine AS builder

WORKDIR /app

# Enable CGO_ENABLED=0 for fully static binary
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

# Copy go.mod
COPY go.mod ./
RUN go mod download || true

# Copy source code
COPY . .

# Build stripped binary
RUN go build -ldflags="-s -w" -o logpulse-server main.go

# Minimal runtime stage
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/logpulse-server /app/logpulse-server

EXPOSE 8080

USER nobody:nobody

ENTRYPOINT ["/app/logpulse-server"]
