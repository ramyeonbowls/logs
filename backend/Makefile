APP_NAME = logpulse-server
PORT ?= 8080

.PHONY: run build test clean docker

run:
	@echo "Starting LogPulse Go 1.25 backend on port $(PORT)..."
	go run main.go

build:
	@echo "Building static binary..."
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/$(APP_NAME) main.go
	@echo "Binary built at bin/$(APP_NAME)"

test:
	@echo "Running tests..."
	go test -v ./...

docker:
	@echo "Building Docker image..."
	docker build -t logpulse-backend:1.25 .

clean:
	rm -rf bin/
