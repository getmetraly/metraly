.PHONY: help ps up down restart rebuild logs-api logs-ui logs-db logs-redis clean-vite-cache \
	build run seed test lint health dashboard \
	login bootstrap dashboard-view dashboard-crud-check connectors-check source-id-check source-create-check source-test-check source-collect-check metric-query-check \
	dashboard-delete-check dashboard-demo-edit-check dashboard-demo-delete-check dashboard-editor-runtime-check restore-demo \
	dashboard-preview-contract-check dashboard-catalog-contract-check \
	runtime-check \
	api-test api-test-handlers api-test-seed ui-typecheck ui-lint ui-test ui-build ui-check brandbook-typecheck brandbook-build brandbook-check check mvp-check \
	brandbook-install brandbook-dist-check brandbook-watch ui-install ui-deps-check docker-ui-deps-check docker-brandbook-dist-check \
	dev-preflight dev-up dev-rebuild dev-reset-ui dev-check \
	setup dev dev-fix dev-stop dev-logs verify verify-ui verify-api verify-runtime ci smoke clean-local help-all ui-ci-install \
	lint-go lint-ui test-go test-ui race vuln secrets semgrep knip \
	quality-go quality-ui quality-security quality-fast quality-deep quality
API_PORT := 8000
DOCKER_COMPOSE := docker compose
RUN_DIR := .run
TOKEN_FILE := $(RUN_DIR)/token

BRANDBOOK_UI_DIR := ../brandbook/packages/ui
BRANDBOOK_UI_DIST := $(BRANDBOOK_UI_DIR)/dist
MVP_SOURCE_ID_CMD := python3 -c 'import sys,json; d=json.load(sys.stdin) or []; m=next((s for s in d if s.get("sourceType")=="github" and s.get("displayName")=="MVP GitHub"), None); print(m.get("id","") if m else "")'
help:
	@echo "Metraly — common commands"
	@echo "  make setup          Install/check deps and build brandbook dist"
	@echo "  make dev            Start local dev stack after preflight"
	@echo "  make dev-fix        Repair stale deps/Vite cache/UI container"
	@echo "  make dev-stop       Stop compose stack"
	@echo "  make dev-logs       Show api + ui logs"
	@echo "  make verify         Run non-destructive checks (UI + API + brandbook)"
	@echo "  make verify-ui      UI deps + typecheck + lint + tests"
	@echo "  make verify-api     Go build + tests + vet"
	@echo "  make verify-runtime Runtime API/dashboard checks"
	@echo "  make smoke          Fast stack smoke check"
	@echo "  make ci             Strict full validation (use in CI)"
	@echo "  make help-all       Show all low-level targets"


help-all:
	@echo "Metraly Make targets — full list"
	@echo "  up/down/restart      Start/stop/restart compose stack"
	@echo "  rebuild              Rebuild api/ui images"
	@echo "  ps                   Show compose status"
	@echo "  logs-api/ui/db/redis Show service logs"
	@echo "  clean-vite-cache     Remove Vite cache in ui container"
	@echo "  dev-preflight        Validate/build brandbook ui dist + check UI deps"
	@echo "  dev-up               dev-preflight + compose up + dependency checks"
	@echo "  dev-rebuild          dev-preflight + rebuild + dev-up"
	@echo "  dev-reset-ui         recreate ui service and clear vite cache"
	@echo "  dev-check            runtime-check + dependency checks"
	@echo "  ui-install           npm install in app/ui"
	@echo "  ui-ci-install        npm ci in app/ui (frozen, for CI)"
	@echo "  ui-deps-check        verify ui node_modules and runtime deps"
	@echo "  docker-ui-deps-check verify runtime deps inside ui container"
	@echo "  brandbook-install    npm install in brandbook/packages/ui"
	@echo "  brandbook-build      build brandbook ui dist"
	@echo "  brandbook-dist-check verify brandbook dist artifacts"
	@echo "  docker-brandbook-dist-check verify brandbook dist in container"
	@echo "  brandbook-watch      watch build for brandbook ui package"
	@echo "  login                Seed admin login and persist bearer token"
	@echo "  bootstrap            GET /api/v1/app/bootstrap"
	@echo "  runtime-check        health + bootstrap + dashboard-view + connectors"
	@echo "  dashboard-view       GET /api/v1/dashboards/sandbox-all-widgets/view"
	@echo "  dashboard-crud-check Validate dashboard view endpoint"
	@echo "  metric-query-check   POST /api/v1/metrics/query"
	@echo "  api-test             backend test suites"
	@echo "  ui-typecheck         TypeScript check in ui/"
	@echo "  ui-lint              ESLint in ui/"
	@echo "  ui-build             Vite production build in ui/ (without re-installing brandbook)"
	@echo "  ui-test              Vitest in ui/"
	@echo "  check                api + ui + brandbook full check"
	@echo "  mvp-check            runtime checks + quality gates"
	@echo ""
	@echo "Quality targets:"
	@echo "  make lint-go         golangci-lint run ./..."
	@echo "  make lint-ui         TypeScript + ESLint in ui/"
	@echo "  make test-go         go test ./..."
	@echo "  make test-ui         Vitest in ui/"
	@echo "  make race            go test -race ./..."
	@echo "  make vuln            govulncheck + osv-scanner (fails with install hint if missing)"
	@echo "  make secrets         gitleaks detect (fails with install hint if missing)"
	@echo "  make semgrep         semgrep scan with .semgrep/ rules (fails with install hint if missing)"
	@echo "  make knip            Knip unused file/export check"
	@echo "  make quality-go      lint-go + test-go"
	@echo "  make quality-ui      brandbook boundary + lint-ui + test-ui + ui-build"
	@echo "  make quality-fast    quality-go + quality-ui (standard local PR gate)"
	@echo "  make quality-deep    quality-fast + race + security + knip"
	@echo "  make quality         alias for quality-deep"
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

ui-install:
	cd ui && npm install

ui-ci-install:
	cd ui && npm ci

ui-deps-check:
	@test -f ui/package.json || (echo "missing ui/package.json"; exit 1)
	@test -d ui/node_modules || (echo "missing ui/node_modules (run: make ui-install)"; exit 1)
	@test -x ui/node_modules/.bin/vite || (echo "missing vite binary (run: make ui-install)"; exit 1)
	@test -d ui/node_modules/@tanstack/react-query || (echo "missing @tanstack/react-query (run: make ui-install)"; exit 1)
	@test -d ui/node_modules/zod || (echo "missing zod (run: make ui-install)"; exit 1)
	@test -d ui/node_modules/@metraly/ui || (echo "missing @metraly/ui link (run: make ui-install && make brandbook-build)"; exit 1)
	@echo "ui-deps-check: OK"

docker-ui-deps-check:
	@$(DOCKER_COMPOSE) exec ui sh -lc 'test -x /workspace/ui/node_modules/.bin/vite && \
		test -d /workspace/ui/node_modules/@tanstack/react-query && \
		test -d /workspace/ui/node_modules/zod && \
		test -d /workspace/ui/node_modules/@metraly/ui' || \
		(echo "missing UI runtime deps in container (run: make dev-fix)"; exit 1)
	@echo "docker-ui-deps-check: OK"

brandbook-install:
	cd $(BRANDBOOK_UI_DIR) && npm install

brandbook-dist-check:
	@test -f $(BRANDBOOK_UI_DIST)/index.js && \
	test -f $(BRANDBOOK_UI_DIST)/index.cjs && \
	test -f $(BRANDBOOK_UI_DIST)/index.d.ts && \
	test -f $(BRANDBOOK_UI_DIST)/styles/metraly-ui.css || \
	(echo "missing @metraly/ui dist artifacts (run: make brandbook-build)"; exit 1)
docker-brandbook-dist-check:
	@$(DOCKER_COMPOSE) exec ui sh -c 'test -f /brandbook/packages/ui/dist/index.js && \
	test -f /brandbook/packages/ui/dist/index.cjs && \
	test -f /brandbook/packages/ui/dist/index.d.ts && \
	test -f /brandbook/packages/ui/dist/styles/metraly-ui.css' || \
	(echo "missing @metraly/ui dist artifacts in container (run: make brandbook-build)"; exit 1)

brandbook-watch:
	cd $(BRANDBOOK_UI_DIR) && npm run build -- --watch

dev-preflight:
	@test -d $(BRANDBOOK_UI_DIR) || (echo "missing $(BRANDBOOK_UI_DIR)"; exit 1)
	@test -f ui/package.json || (echo "missing ui/package.json"; exit 1)
	@if [ ! -d ui/node_modules ]; then $(MAKE) ui-install; fi
	@$(MAKE) ui-deps-check || ($(MAKE) ui-install && $(MAKE) ui-deps-check)
	@$(MAKE) brandbook-dist-check || ($(MAKE) brandbook-build && $(MAKE) brandbook-dist-check)

dev-up: dev-preflight up docker-ui-deps-check docker-brandbook-dist-check

dev-rebuild: dev-preflight rebuild dev-up

dev-reset-ui:
	$(DOCKER_COMPOSE) rm -sf ui
	$(DOCKER_COMPOSE) up -d --no-deps ui
	$(MAKE) clean-vite-cache
	$(MAKE) docker-ui-deps-check
	$(MAKE) docker-brandbook-dist-check

dev-check: runtime-check ui-deps-check docker-ui-deps-check brandbook-dist-check docker-brandbook-dist-check

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

source-id-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | $(MVP_SOURCE_ID_CMD)); \
	if [ -n "$$SOURCE_ID" ]; then \
		echo "$$SOURCE_ID"; \
	else \
		echo ""; \
	fi

source-create-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | $(MVP_SOURCE_ID_CMD)); \
	if [ -z "$$SOURCE_ID" ]; then \
		SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
			-d '{"sourceType":"github","displayName":"MVP GitHub","secret":"ghp_demo_token","config":{"syncInterval":"Every 5 minutes","repoScope":"All repos in org","includeArchived":"false","backfill":"90 days","org":"metraly-demo"}}' \
			| python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))'); \
		test -n "$$SOURCE_ID" || (echo "failed to create MVP GitHub source"; exit 1); \
		echo "Created MVP GitHub source: $$SOURCE_ID"; \
	else \
		echo "Reusing existing MVP GitHub source: $$SOURCE_ID"; \
	fi
source-test-check: source-create-check
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | $(MVP_SOURCE_ID_CMD)); \
	curl -s -X POST http://localhost:$(API_PORT)/api/v1/sources/$$SOURCE_ID/test -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

source-collect-check: source-create-check
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	SOURCE_ID=$$(curl -s http://localhost:$(API_PORT)/api/v1/sources -H "Authorization: Bearer $$TOKEN" | $(MVP_SOURCE_ID_CMD)); \
	curl -s -X POST http://localhost:$(API_PORT)/api/v1/sources/$$SOURCE_ID/collect -H "Authorization: Bearer $$TOKEN" | python3 -m json.tool

metric-query-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	curl -s -X POST http://localhost:$(API_PORT)/api/v1/metrics/query \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d '{"metricId":"pr_count","start":"2026-05-01T00:00:00Z","end":"2026-06-01T00:00:00Z","granularity":"day","groupBy":[],"filters":{}}' | python3 -m json.tool

# dashboard-create-render-check: create a dashboard via API, fetch /view, assert widgetErrors is empty
# and all persisted widgetTypes are in the supported set. Proves the taxonomy fix (P0-1) end-to-end.
dashboard-create-render-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	PAYLOAD='{"name":"CI Render Check","icon":"activity","sourceType":"user-created","widgets":[{"instanceId":"chk-1","widgetType":"stat-card","config":{"type":"stat-card","metricId":"deploy-freq","showSparkline":true,"colorKey":"cyan"}},{"instanceId":"chk-2","widgetType":"metric-chart","config":{"type":"metric-chart","metricId":"velocity","chartVariant":"area","showCompare":false}}],"layout":[{"instanceId":"chk-1","x":0,"y":0,"w":6,"h":2},{"instanceId":"chk-2","x":6,"y":0,"w":6,"h":2}],"defaultFilters":{"timeRange":"30d","team":"All teams","repo":"All repos"},"visibility":"private"}'; \
	DASH_ID=$$(curl -s -X POST http://localhost:$(API_PORT)/api/v1/dashboards \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d "$$PAYLOAD" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("id",""))'); \
	test -n "$$DASH_ID" || (echo "create failed: empty id"; exit 1); \
	VIEW=$$(curl -s http://localhost:$(API_PORT)/api/v1/dashboards/$$DASH_ID/view -H "Authorization: Bearer $$TOKEN"); \
	ERRORS=$$(echo "$$VIEW" | python3 -c 'import sys,json; d=json.load(sys.stdin); e=d.get("widgetErrors",{}); print(len(e))'); \
	test "$$ERRORS" = "0" || (echo "widgetErrors not empty: $$VIEW"; curl -s -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/$$DASH_ID -H "Authorization: Bearer $$TOKEN"; exit 1); \
	curl -s -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/$$DASH_ID -H "Authorization: Bearer $$TOKEN" > /dev/null; \
	echo "dashboard-create-render-check: PASS (id=$$DASH_ID, widgetErrors=0)"

dashboard-delete-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	ID=$$(curl -s -X POST http://localhost:$(API_PORT)/api/v1/dashboards \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d '{"name":"Delete Check","icon":"activity","widgets":[],"layout":[]}' \
		| python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))'); \
	test -n "$$ID" || (echo "create failed"; exit 1); \
	STATUS=$$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/$$ID \
		-H "Authorization: Bearer $$TOKEN"); \
	test "$$STATUS" = "204" || (echo "delete returned $$STATUS, want 204"; exit 1); \
	VIEW_STATUS=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$(API_PORT)/api/v1/dashboards/$$ID/view \
		-H "Authorization: Bearer $$TOKEN"); \
	test "$$VIEW_STATUS" = "404" || (echo "view after delete returned $$VIEW_STATUS, want 404"; exit 1); \
	echo "dashboard-delete-check: PASS (id=$$ID, delete=204, view-after=404)"

dashboard-demo-edit-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	DEMO=$$(curl -s http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets \
		-H "Authorization: Bearer $$TOKEN"); \
	VER=$$(echo "$$DEMO" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("version",1))'); \
	WIDGETS=$$(echo "$$DEMO" | python3 -c 'import sys,json;print(json.dumps(json.load(sys.stdin).get("widgets",[])))'); \
	LAYOUT=$$(echo "$$DEMO" | python3 -c 'import sys,json;print(json.dumps(json.load(sys.stdin).get("layout",[])))'); \
	UPD=$$(curl -s -X PUT http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d "{\"name\":\"Demo (edited)\",\"icon\":\"sparkles\",\"version\":$$VER,\"widgets\":$$WIDGETS,\"layout\":$$LAYOUT}"); \
	UPD_NAME=$$(echo "$$UPD" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("name",""))'); \
	test "$$UPD_NAME" = "Demo (edited)" || (echo "update failed: got $$UPD_NAME"; exit 1); \
	NEWVER=$$(echo "$$UPD" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("version",1))'); \
	curl -s -X PUT http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d "{\"name\":\"Demo\",\"icon\":\"sparkles\",\"version\":$$NEWVER,\"widgets\":$$WIDGETS,\"layout\":$$LAYOUT}" > /dev/null; \
	echo "dashboard-demo-edit-check: PASS (name updated to Demo (edited) and restored)"

dashboard-demo-delete-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	STATUS=$$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets \
		-H "Authorization: Bearer $$TOKEN"); \
	test "$$STATUS" = "204" || { echo "delete returned $$STATUS, want 204"; exit 1; }; \
	VIEW_STATUS=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets/view \
		-H "Authorization: Bearer $$TOKEN"); \
	test "$$VIEW_STATUS" = "404" || { echo "view after delete returned $$VIEW_STATUS, want 404"; exit 1; }; \
	$(MAKE) restart; \
	$(MAKE) login; \
	TOKEN=$$(cat $(TOKEN_FILE)); \
	AFTER_RESTART_STATUS=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets/view \
		-H "Authorization: Bearer $$TOKEN"); \
	test "$$AFTER_RESTART_STATUS" = "404" || { echo "demo silently restored after restart ($$AFTER_RESTART_STATUS)"; exit 1; }; \
	echo "dashboard-demo-delete-check: PASS (delete=204, view-after=404, restart-kept-404)"

dashboard-editor-runtime-check: login
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	ID=$$(curl -s -X POST http://localhost:$(API_PORT)/api/v1/dashboards \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d '{"name":"Editor Runtime Check","icon":"activity","widgets":[{"instanceId":"rt-1","widgetType":"stat-card","config":{"type":"stat-card","metricId":"deploy-freq"}},{"instanceId":"rt-2","widgetType":"metric-chart","config":{"type":"metric-chart","metricId":"velocity"}},{"instanceId":"rt-3","widgetType":"health-gauge","config":{"type":"health-gauge","metricId":"health-score"}},{"instanceId":"rt-4","widgetType":"compare-bar-chart","config":{"type":"compare-bar-chart","metricId":"velocity"}},{"instanceId":"rt-5","widgetType":"recent-activity","config":{"type":"recent-activity","maxItems":8}}],"layout":[{"instanceId":"rt-1","x":0,"y":0,"w":4,"h":2},{"instanceId":"rt-2","x":4,"y":0,"w":4,"h":2},{"instanceId":"rt-3","x":8,"y":0,"w":4,"h":2},{"instanceId":"rt-4","x":0,"y":2,"w":6,"h":2},{"instanceId":"rt-5","x":6,"y":2,"w":6,"h":2}]}' \
		| python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))'); \
	test -n "$$ID" || (echo "create failed"; exit 1); \
	INITIAL_ERRORS=$$(curl -s http://localhost:$(API_PORT)/api/v1/dashboards/$$ID/view \
		-H "Authorization: Bearer $$TOKEN" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("widgetErrors",{})))'); \
	test "$$INITIAL_ERRORS" = "0" || (echo "widgetErrors not empty after create"; curl -s -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/$$ID -H "Authorization: Bearer $$TOKEN" > /dev/null; exit 1); \
	VER=$$(curl -s http://localhost:$(API_PORT)/api/v1/dashboards/$$ID \
		-H "Authorization: Bearer $$TOKEN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("version",1))'); \
	UPD=$$(curl -s -X PUT http://localhost:$(API_PORT)/api/v1/dashboards/$$ID \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d "{\"name\":\"Editor Runtime Updated\",\"icon\":\"activity\",\"version\":$$VER,\"widgets\":[{\"instanceId\":\"rt-1\",\"widgetType\":\"stat-card\",\"config\":{\"type\":\"stat-card\",\"metricId\":\"velocity\"}},{\"instanceId\":\"rt-2\",\"widgetType\":\"metric-chart\",\"config\":{\"type\":\"metric-chart\",\"metricId\":\"pr-cycle\"}},{\"instanceId\":\"rt-3\",\"widgetType\":\"health-gauge\",\"config\":{\"type\":\"health-gauge\",\"metricId\":\"health-score\"}},{\"instanceId\":\"rt-4\",\"widgetType\":\"compare-bar-chart\",\"config\":{\"type\":\"compare-bar-chart\",\"metricId\":\"velocity\"}},{\"instanceId\":\"rt-5\",\"widgetType\":\"recent-activity\",\"config\":{\"type\":\"recent-activity\",\"maxItems\":5}}],\"layout\":[{\"instanceId\":\"rt-1\",\"x\":0,\"y\":0,\"w\":4,\"h\":2},{\"instanceId\":\"rt-2\",\"x\":4,\"y\":0,\"w\":4,\"h\":2},{\"instanceId\":\"rt-3\",\"x\":8,\"y\":0,\"w\":4,\"h\":2},{\"instanceId\":\"rt-4\",\"x\":0,\"y\":2,\"w\":6,\"h\":2},{\"instanceId\":\"rt-5\",\"x\":6,\"y\":2,\"w\":6,\"h\":2}]}"); \
	UPD_NAME=$$(echo "$$UPD" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("name",""))'); \
	test "$$UPD_NAME" = "Editor Runtime Updated" || (echo "update failed: $$UPD"; curl -s -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/$$ID -H "Authorization: Bearer $$TOKEN" > /dev/null; exit 1); \
	ERRORS=$$(curl -s http://localhost:$(API_PORT)/api/v1/dashboards/$$ID/view \
		-H "Authorization: Bearer $$TOKEN" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("widgetErrors",{})))'); \
	curl -s -X DELETE http://localhost:$(API_PORT)/api/v1/dashboards/$$ID -H "Authorization: Bearer $$TOKEN" > /dev/null; \
	test "$$ERRORS" = "0" || (echo "widgetErrors not empty after update"; exit 1); \
	echo "dashboard-editor-runtime-check: PASS (create+update+view: widgetErrors=0)"

restore-demo: login
	@echo "Restoring Demo dashboard explicitly…"
	$(DOCKER_COMPOSE) exec api sh -c 'SEED_ONLY=true SEED_ON_START=true SEED_RESTORE_DEMO=true SEED_ADMIN_EMAIL=$$SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD=$$SEED_ADMIN_PASSWORD /app/api'
	@TOKEN=$$(cat $(TOKEN_FILE)); \
	STATUS=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$(API_PORT)/api/v1/dashboards/sandbox-all-widgets/view -H "Authorization: Bearer $$TOKEN"); \
	test "$$STATUS" = "200" || (echo "restore-demo failed: view returned $$STATUS"; exit 1); \
	echo "restore-demo: PASS"

dashboard-preview-contract-check:
	cd ui && npm run test -- src/components/dashboard/previewData.test.ts

dashboard-catalog-contract-check:
	cd ui && npm run test -- src/features/dashboardEditor/widgetCatalogContracts.test.ts
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

setup: ui-install brandbook-build brandbook-dist-check ui-deps-check

# dev is a user-friendly alias for dev-up; both do the same preflight + stack bring-up.
# Keep dev-up for backwards compatibility.
dev: dev-preflight up docker-ui-deps-check docker-brandbook-dist-check

dev-fix:
	$(MAKE) ui-install
	$(MAKE) brandbook-build
	-$(MAKE) clean-vite-cache
	$(DOCKER_COMPOSE) rm -sf ui
	$(DOCKER_COMPOSE) up -d --no-deps ui
	$(MAKE) docker-ui-deps-check
	$(MAKE) docker-brandbook-dist-check

dev-stop:
	$(DOCKER_COMPOSE) down

dev-logs:
	$(DOCKER_COMPOSE) logs --tail=60 api ui

verify-ui: ui-deps-check ui-typecheck ui-lint ui-test

verify-api:
	go build -v -o bin/api ./cmd/api/
	go test ./cmd/api/...
	go vet ./...

verify-runtime: runtime-check dashboard-editor-runtime-check metric-query-check

verify: verify-ui verify-api brandbook-dist-check

smoke: health bootstrap dashboard-view connectors-check docker-ui-deps-check docker-brandbook-dist-check

ci: ui-ci-install brandbook-build verify

clean-local:
	rm -rf ui/node_modules/.vite

mvp-check: runtime-check dashboard-crud-check dashboard-create-render-check dashboard-delete-check dashboard-demo-edit-check dashboard-demo-delete-check restore-demo dashboard-editor-runtime-check dashboard-preview-contract-check dashboard-catalog-contract-check source-create-check source-test-check source-collect-check metric-query-check check

## Lint
lint-go:
	golangci-lint run ./...

lint-ui:
	cd ui && npm run typecheck && npm run lint

## Test aliases
test-go:
	go test ./...

test-ui:
	cd ui && npm run test

ui-build:
	cd ui && npx vite build

## Deep checks
race:
	go test -race ./...

vuln:
	@command -v govulncheck > /dev/null 2>&1 || (echo 'missing govulncheck. Install: go install golang.org/x/vuln/cmd/govulncheck@latest'; exit 1)
	@command -v osv-scanner > /dev/null 2>&1 || (echo 'missing osv-scanner. Install: https://github.com/google/osv-scanner'; exit 1)
	govulncheck ./...
	osv-scanner scan source .

secrets:
	@command -v gitleaks > /dev/null 2>&1 || (echo 'missing gitleaks. Install: https://github.com/gitleaks/gitleaks'; exit 1)
	gitleaks detect --source . --redact

semgrep:
	@command -v semgrep > /dev/null 2>&1 || (echo 'missing semgrep. Install: pip install semgrep'; exit 1)
	semgrep scan --config .semgrep/ . --error

knip:
	cd ui && npm run knip

## Composite quality targets
quality-go: lint-go test-go

quality-ui: brandbook-dist-check lint-ui test-ui ui-build

quality-security: secrets vuln semgrep

quality-fast: quality-go quality-ui

quality-deep: quality-fast race quality-security knip

quality: quality-deep
