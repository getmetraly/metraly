.PHONY: build run stop clean test lint docker-build docker-up docker-down docker-logs ui-run

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

# Docker: build all
docker-build:
	@echo "Building Docker images..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build --parallel

# Docker: start all services
docker-up:
	@echo "Starting services..."
	$(DOCKER_COMPOSE) up -d
	@echo "Started Community Preview services: api, ui, postgres/timescaledb, redis"

# Docker: stop all services
docker-down:
	@echo "Stopping services..."
	$(DOCKER_COMPOSE) down

# Docker: rebuild and start
docker-restart: docker-down docker-up

# Docker: rebuild API only
docker-build-api:
	@echo "Building API image..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build api

# Docker: restart API
docker-restart-api: docker-build-api
	$(DOCKER_COMPOSE) up -d api

# Docker: show logs
docker-logs:
	$(DOCKER_COMPOSE) logs -f

# Docker: show status
docker-ps:
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
	@echo "  build              - Build Go API"
	@echo "  run                - Run API locally"
	@echo "  ui-run             - Run UI locally"
	@echo "  test               - Run tests"
	@echo "  lint               - Run linter"
	@echo "  docker-up          - Start all Docker services"
	@echo "  docker-down        - Stop all Docker services"
	@echo "  docker-restart     - Restart all Docker services"
	@echo "  docker-build-api   - Rebuild API only"
	@echo "  docker-restart-api - Restart API only"
	@echo "  docker-logs        - Show Docker logs"
	@echo "  docker-ps          - Show Docker status"
	@echo "  health             - Check API health"
	@echo "  dashboard          - Check dashboard data"
	@echo "  clean              - Clean build artifacts"
