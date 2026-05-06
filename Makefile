.PHONY: build run stop clean test lint up down dev logs ps ui-run

# Defaults
APP_NAME := metraly
API_PORT := 8000
UI_PORT := 3000

# Go
GO := go
GOFLAGS := -v

# Docker
DOCKER := docker
DOCKER_COMPOSE := docker compose

# Build API
build:
	@echo "Building API..."
	$(GO) build $(GOFLAGS) -o bin/api ./cmd/api/

# Run API locally
run: build
	@echo "Starting API on port $(API_PORT)..."
	POSTGRES_DSN=postgres://metraly:metraly@localhost:5432/metraly?sslmode=disable REDIS_HOST=localhost REDIS_PORT=6379 ./bin/api

# Run UI locally
ui-run:
	@echo "Starting UI on port $(UI_PORT)..."
	cd ui && npm run dev

# Run tests
test:
	@echo "Running tests..."
	$(GO) test $(GOFLAGS) ./...

# Run linter
lint:
	@echo "Running linter..."
	$(GO) vet ./...
	@which staticcheck > /dev/null && staticcheck ./... || echo "staticcheck not installed"

# Canonical local start command
up:
	@echo "Building and starting all services..."
	$(DOCKER_COMPOSE) up -d --build

# Canonical local stop command
down:
	@echo "Stopping services..."
	$(DOCKER_COMPOSE) down

# Alias for one-shot local startup
dev: up

# Canonical local logs command
logs:
	$(DOCKER_COMPOSE) logs -f

# Canonical local status command
ps:
	$(DOCKER_COMPOSE) ps

# Health check
health:
	@echo "Checking API health..."
	@curl -s http://localhost:$(API_PORT)/api/v1/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:$(API_PORT)/api/v1/health

# Dashboard check
dashboard:
	@echo "Checking dashboard..."
	@curl -s http://localhost:$(API_PORT)/api/v1/dashboard | python3 -m json.tool 2>/dev/null || curl -s http://localhost:$(API_PORT)/api/v1/dashboard

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	$(DOCKER) system prune -f --filter "label=com.docker.compose.project=$(APP_NAME)" 2>/dev/null || true

# Show help
help:
	@echo "Metraly - Team Engineering Metrics API"
	@echo ""
	@echo "Available targets:"
	@echo "  up                 - Start all local services (canonical quick start)"
	@echo "  down               - Stop all local services"
	@echo "  logs               - Show local service logs"
	@echo "  ps                 - Show local service status"
	@echo "  build              - Build Go API"
	@echo "  run                - Run API locally"
	@echo "  ui-run             - Run UI locally"
	@echo "  test               - Run tests"
	@echo "  lint               - Run linter"
	@echo "  dev                - Alias for up"
	@echo "  health             - Check API health"
	@echo "  dashboard          - Check dashboard data"
	@echo "  clean              - Clean build artifacts"
