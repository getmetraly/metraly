# Build context: metraly project root (one level above app/)
#
# WORKDIR depth problem: npm's arborist computes relpath(WORKDIR, resolvedTarget)
# to look up the link target in its package tree. The lockfile stores that
# target as "../../brandbook/packages/ui" (generated on the host where the
# project sits at depth >= 2). With WORKDIR /app (depth 1), relpath resolves to
# "../brandbook/packages/ui" — key mismatch → undefined node → crash.
#
# Fix: WORKDIR /workspace/ui (depth 2) so that
#   relpath('/workspace/ui', '/brandbook/packages/ui') == '../../brandbook/packages/ui'
# which matches the lockfile key exactly.

FROM node:20-alpine AS deps
WORKDIR /workspace/ui
# Copy brandbook to the path that "file:../../brandbook/packages/ui" resolves to
# from /workspace/ui: two dirs up lands at /, then brandbook/packages/ui.
COPY brandbook/packages/ui /brandbook/packages/ui
COPY app/ui/package.json app/ui/package-lock.json ./
RUN npm install --ignore-scripts

# ── dev: Vite dev server with HMR ────────────────────────────────────────────
FROM deps AS dev
# Source files and brandbook are overridden at runtime by docker-compose volume
# mounts. This COPY makes the image runnable standalone without compose.
COPY app/ui/ .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

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
