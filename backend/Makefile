APP_NAME = logpulse-server
PORT ?= 8080
ENV_FILE ?= ../../.env

.PHONY: run build test clean docker

run:
	@if { [ -z "$${APP_USERNAME:-}" ] || [ -z "$${APP_PASSWORD:-}" ]; } && [ -f "$(ENV_FILE)" ]; then \
		set -a; . "$(ENV_FILE)"; set +a; \
	fi; \
	if [ -z "$${APP_USERNAME:-}" ] || [ -z "$${APP_PASSWORD:-}" ]; then \
		echo "APP_USERNAME and APP_PASSWORD must be set (or defined in $(ENV_FILE))." >&2; exit 1; \
	fi; \
	echo "Starting LogPulse Go API on port $(PORT)..."; \
	go run .

build:
	@echo "Building static binary..."
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/$(APP_NAME) .
	@echo "Binary built at bin/$(APP_NAME)"

test:
	@echo "Running tests..."
	go test -v ./...

docker:
	@echo "Building Go API image..."
	docker build -t logpulse-backend:1.25 .

clean:
	rm -rf bin/
