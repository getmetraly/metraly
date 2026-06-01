# Build context: metraly project root (one level above app/)
#
# WORKDIR depth: npm arborist computes relpath(WORKDIR, resolvedTarget) to look
# up the @metraly/ui link target in the lockfile. The lockfile records the
# target as "../../brandbook/packages/ui" (generated on host at depth >= 2).
# With WORKDIR /workspace/ui (depth 2):
#   relpath('/workspace/ui', '/brandbook/packages/ui') == '../../brandbook/packages/ui'
# which matches the lockfile key and avoids the arborist TypeError.
#
# @metraly/ui builds to dist/. The host pre-builds it before docker compose up.
# The compose volume mount (../brandbook/packages/ui:/brandbook/packages/ui)
# includes dist/ so that running 'npm run build' in brandbook on the host will
# trigger Vite HMR for CSS/JS changes.

FROM node:20-alpine AS deps
WORKDIR /workspace/ui
# Copy pre-built brandbook (including dist/) — built on host with 'npm run build'
# in brandbook/packages/ui before running docker compose.
COPY brandbook/packages/ui /brandbook/packages/ui
COPY app/ui/package.json app/ui/package-lock.json ./
RUN npm ci --ignore-scripts

# ── dev: Vite dev server with HMR ────────────────────────────────────────────
FROM deps AS dev
# Source files are overridden at runtime by docker-compose volume mounts:
#   ./ui                     → /workspace/ui
#   ui_node_modules          → /workspace/ui/node_modules (named volume, avoids bind-mount masking)
#   ../brandbook/packages/ui → /brandbook/packages/ui  (live dist/ for HMR)
COPY app/ui/ .
EXPOSE 3000
# Run vite directly to bypass npm lifecycle hooks (predev runs brandbook build
# which hangs in Docker due to network restrictions).
CMD ["node", "node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3000"]

# ── builder: production bundle ────────────────────────────────────────────────
FROM deps AS builder
COPY app/ui/ .
RUN npm run build

# ── prod: nginx static server ─────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /workspace/ui/dist /usr/share/nginx/html
COPY app/ui/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
