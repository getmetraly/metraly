.PHONY: help ps up down restart rebuild logs-api logs-ui logs-db logs-redis clean-vite-cache \
	build run seed test lint health dashboard \
	login bootstrap dashboard-view dashboard-crud-check connectors-check source-create-check source-test-check source-collect-check metric-query-check runtime-check \
	api-test api-test-handlers api-test-seed ui-typecheck ui-lint ui-test ui-check brandbook-typecheck brandbook-build brandbook-check check mvp-check

API_PORT := 8000
DOCKER_COMPOSE := docker compose
RUN_DIR := .run
TOKEN_FILE := $(RUN_DIR)/token

help:
	@echo "Metraly Make targets"
	@echo "  up/down/restart      Start/stop/restart compose stack"
	@echo "  rebuild              Rebuild api/ui images"
	@echo "  ps                   Show compose status"
	@echo "  logs-api/ui/db/redis Show service logs"
	@echo "  clean-vite-cache     Remove Vite cache in ui container"
	@echo "  health               GET /api/v1/health"
	@echo "  login                Seed admin login and persist bearer token"
	@echo "  bootstrap            GET /api/v1/app/bootstrap"
	@echo "  dashboard-view       GET /api/v1/dashboards/sandbox-all-widgets/view"
	@echo "  dashboard-crud-check Validate dashboard view endpoint for active dashboard"
	@echo "  connectors-check     GET /api/v1/sources"
	@echo "  source-create-check  POST /api/v1/sources (github demo source)"
	@echo "  source-test-check    POST /api/v1/sources/{id}/test"
	@echo "  source-collect-check POST /api/v1/sources/{id}/collect"
	@echo "  metric-query-check   POST /api/v1/metrics/query"
	@echo "  runtime-check        health + bootstrap + dashboard-view + connectors"
	@echo "  api-test*            backend test suites"
	@echo "  ui-check             ui typecheck + lint + test"
	@echo "  brandbook-check      brandbook typecheck + build"
	@echo "  check                api + ui + brandbook"
	@echo "  mvp-check            runtime checks + quality gates"

ps:
	$(DOCKER_COMPOSE) ps

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

restart: down up

rebuild:
	$(DOCKER_COMPOSE) build api ui

logs-api:
	$(DOCKER_COMPOSE) logs --tail=120 api

logs-ui:
	$(DOCKER_COMPOSE) logs --tail=120 ui

logs-db:
	$(DOCKER_COMPOSE) logs --tail=120 postgres

logs-redis:
	$(DOCKER_COMPOSE) logs --tail=120 redis

clean-vite-cache:
	$(DOCKER_COMPOSE) exec -u root ui rm -rf /workspace/ui/node_modules/.vite

build:
	go build -v -o bin/api ./cmd/api/

run: build
	./bin/api

seed: build
	SEED_ONLY=true SEED_ON_START=true SEED_ADMIN_EMAIL=admin@metraly.local SEED_ADMIN_PASSWORD=admin123 ./bin/api

test:
	go test -v ./...

lint:
	go vet ./...

health:
	@curl -s http://localhost:$(API_PORT)/api/v1/health | python3 -m json.tool

login:
	@mkdir -p $(RUN_DIR)
	@curl -s http://localhost:$(API_PORT)/api/v1/auth/login \
		-H 'Content-Type: application/json' \
		-d '{"email":"admin@metraly.local","password":"admin123"}' \
		| python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))' > $(TOKEN_FILE)
	@test -s $(TOKEN_FILE) || (echo "login failed"; exit 1)
	@echo "token written to $(TOKEN_FILE)"

bootstrap: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	curl -s http://localhost:$(API_PORT)/api/v1/app/bootstrap -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

dashboard-view: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	curl -s http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets/view -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

dashboard-crud-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/dashboards -H "Authorization: Bearer $$TOKEN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")'); \
	test -n "$$ID"; \
	curl -s http://localhost:$(API_PORT)/api/v1/dashboards/$$ID/view -H "Authorization: Bearer $$TOKEN" > /dev/null; \
	echo "dashboard view check ok for $$ID"

connectors-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

source-create-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d '{"sourceType":"github","displayName":"MVP GitHub","secret":"ghp_demo_token","config":{"syncInterval":"Every 5 minutes","repoScope":"All repos in org","includeArchived":"false","backfill":"90 days","org":"metraly-demo"}}' | python3 -m json.tool

source-test-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | python3 -c 'import sys,json;d=json.load(sys.stdin) or [];print(d[-1]["id"] if d else "")'); \
	test -n "$$SOURCE_ID"; \
	curl -s -X POST http://localhost:$(API_PORT)/api/v1/sources/$$SOURCE_ID/test -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

source-collect-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | python3 -c 'import sys,json;d=json.load(sys.stdin) or [];print(d[-1]["id"] if d else "")'); \
	test -n "$$SOURCE_ID"; \
	curl -s -X POST http://localhost:$(API_PORT)/api/v1/sources/$$SOURCE_ID/collect -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

metric-query-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	curl -s -X POST http://localhost:$(API_PORT)/api/v1/metrics/query \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d '{"metricId":"pr_count","start":"2026-05-01T00:00:00Z","end":"2026-06-01T00:00:00Z","granularity":"day","groupBy":[],"filters":{}}' | python3 -m json.tool

runtime-check: health bootstrap dashboard-view connectors-check

api-test:
	go test ./...

api-test-handlers:
	go test ./cmd/api/handlers/...

api-test-seed:
	go test ./cmd/api/seed/...

ui-typecheck:
	cd ui && npm run typecheck

ui-lint:
	cd ui && npm run lint

ui-test:
	cd ui && npm run test

ui-check: ui-typecheck ui-lint ui-test

brandbook-typecheck:
	cd ../brandbook/packages/ui && npm run typecheck

brandbook-build:
	cd ../brandbook/packages/ui && npm run build

brandbook-check: brandbook-typecheck brandbook-build

check: api-test ui-check brandbook-check

mvp-check: runtime-check dashboard-crud-check source-create-check source-test-check source-collect-check metric-query-check check
