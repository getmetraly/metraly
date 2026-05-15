.PHONY: build run seed stop clean test lint up down dev logs ps ui-run health dashboard help

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

# Build API
build:
	@echo "Building API..."
	$(GO) build $(GOFLAGS) -o bin/api ./cmd/api/

# Run API locally
run: build
	@echo "Starting API on port $(API_PORT)..."
	env $(LOCAL_SEED_ENV) ./bin/api

# Seed local database
seed: build
	@echo "Seeding local database..."
	$(DOCKER_COMPOSE) up -d redis postgres
	@echo "Waiting for database services to become healthy..."
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' "$$(docker compose ps -q postgres)")" = healthy ] && [ "$$(docker inspect -f '{{.State.Health.Status}}' "$$(docker compose ps -q redis)")" = healthy ]; do sleep 1; done
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
up:
	@mkdir -p $(RUN_DIR)
	@touch $(API_LOG) $(UI_LOG)
	@echo "Starting database services..."
	$(DOCKER_COMPOSE) up -d redis postgres
	@echo "Waiting for database services to become healthy..."
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' "$$(docker compose ps -q postgres)")" = healthy ] && [ "$$(docker inspect -f '{{.State.Health.Status}}' "$$(docker compose ps -q redis)")" = healthy ]; do sleep 1; done
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
