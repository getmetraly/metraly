.PHONY: build run seed stop clean test lint up down dev logs ps ui-run health dashboard help start-db wait-db

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

# Runtime state
RUN_DIR := .run
API_PID_FILE := $(RUN_DIR)/api.pid
UI_PID_FILE := $(RUN_DIR)/ui.pid
API_LOG := $(RUN_DIR)/api.log
UI_LOG := $(RUN_DIR)/ui.log
LOCAL_SEED_ENV := POSTGRES_DSN=postgres://metraly:metraly@localhost:5432/metraly?sslmode=disable REDIS_HOST=localhost REDIS_PORT=6379
LOCAL_SEED_ONLY_ENV := SEED_ONLY=true SEED_ON_START=true SEED_ADMIN_EMAIL=admin@metraly.local SEED_ADMIN_PASSWORD=admin123

HOST_REDIS_CONTAINER := metraly-redis-host
HOST_POSTGRES_CONTAINER := metraly-postgres-host

DB_READY_CMD_COMPOSE := [ "$$(docker inspect -f '{{.State.Health.Status}}' "$$(docker compose ps -q postgres)")" = healthy ] && [ "$$(docker inspect -f '{{.State.Health.Status}}' "$$(docker compose ps -q redis)")" = healthy ]
DB_READY_CMD_HOST := docker exec $(HOST_REDIS_CONTAINER) redis-cli ping >/dev/null 2>&1 && docker exec $(HOST_POSTGRES_CONTAINER) pg_isready -U metraly -d metraly >/dev/null 2>&1

# Start local database services (compose first, host-network fallback)
start-db:
	@echo "Starting database services..."
	@set -e; \
	if $(DOCKER_COMPOSE) up -d redis postgres; then \
		echo "Using docker compose database services."; \
	else \
		echo "Docker bridge network unavailable, using host-network fallback containers..."; \
		docker rm -f $(HOST_REDIS_CONTAINER) $(HOST_POSTGRES_CONTAINER) >/dev/null 2>&1 || true; \
		docker run -d --name $(HOST_REDIS_CONTAINER) --network host redis:7-alpine >/dev/null; \
		docker run -d --name $(HOST_POSTGRES_CONTAINER) --network host \
			-e POSTGRES_USER=metraly \
			-e POSTGRES_PASSWORD=metraly \
			-e POSTGRES_DB=metraly \
			timescale/timescaledb:latest-pg16 >/dev/null; \
	fi

# Wait until local database services are ready
wait-db:
	@echo "Waiting for database services to become healthy..."
	@set -e; \
	if [ -n "$$(docker compose ps -q postgres 2>/dev/null)" ] && [ -n "$$(docker compose ps -q redis 2>/dev/null)" ]; then \
		until $(DB_READY_CMD_COMPOSE); do sleep 1; done; \
	else \
		until $(DB_READY_CMD_HOST); do sleep 1; done; \
	fi

# Build API
build:
	@echo "Building API..."
	$(GO) build $(GOFLAGS) -o bin/api ./cmd/api/

# Run API locally
run: build
	@echo "Starting API on port $(API_PORT)..."
	env $(LOCAL_SEED_ENV) ./bin/api

# Seed local database
seed: build start-db wait-db
	@echo "Seeding local database..."
	@env $(LOCAL_SEED_ONLY_ENV) $(LOCAL_SEED_ENV) ./bin/api

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
# Canonical local start command
up: start-db wait-db
	@mkdir -p $(RUN_DIR)
	@touch $(API_LOG) $(UI_LOG)
	@echo "Building API..."
	$(MAKE) build
	@echo "Starting API..."
	@nohup env $(LOCAL_SEED_ENV) ./bin/api > $(API_LOG) 2>&1 & echo $$! > $(API_PID_FILE)
	@echo "Starting UI..."
	@nohup sh -c 'cd ui && VITE_API_PROXY_TARGET=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 3000' > $(UI_LOG) 2>&1 & echo $$! > $(UI_PID_FILE)

	@echo "Project is running."

# Canonical local stop command
down:
	@echo "Stopping services..."
	@if [ -f $(UI_PID_FILE) ]; then kill "$$(cat $(UI_PID_FILE))" || true; rm -f $(UI_PID_FILE); fi
	@if [ -f $(API_PID_FILE) ]; then kill "$$(cat $(API_PID_FILE))" || true; rm -f $(API_PID_FILE); fi
	@docker rm -f $(HOST_REDIS_CONTAINER) $(HOST_POSTGRES_CONTAINER) >/dev/null 2>&1 || true
	$(DOCKER_COMPOSE) down
# Alias for one-shot local startup
dev: up

# Canonical local logs command
logs:
	@tail -f $(API_LOG) $(UI_LOG)

# Canonical local status command
ps:
	@$(DOCKER_COMPOSE) ps
	@for pidfile in $(API_PID_FILE) $(UI_PID_FILE); do \
		if [ -f "$$pidfile" ]; then \
			printf '%s: ' "$$pidfile"; \
			cat "$$pidfile"; \
		else \
			printf '%s: not running\n' "$$pidfile"; \
		fi; \
	done

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
	rm -rf bin/ $(RUN_DIR)/
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
	@echo "  seed               - Seed local database"
	@echo "  ui-run             - Run UI locally"
	@echo "  test               - Run tests"
	@echo "  lint               - Run linter"
	@echo "  dev                - Alias for up"
	@echo "  health             - Check API health"
	@echo "  dashboard          - Check dashboard data"
	@echo "  clean              - Clean build artifacts"
