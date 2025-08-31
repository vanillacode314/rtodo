FROM node:22-slim AS build
ENV BUN_INSTALL_CACHE_DIR="/root/.cache/bun"
RUN npm i -g bun
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=s/25fbd5bd-0df6-4ba4-b1f0-71300374581a-/root/.cache/bun,target=/root/.cache/bun bun install --frozen-lockfile
ARG VITE_SYNC_SERVER_BASE_URL
RUN bun run build --filter web

FROM caddy:alpine
COPY --from=build /app/apps/web/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/.output/public /var/www
