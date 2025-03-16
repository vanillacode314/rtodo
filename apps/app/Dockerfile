FROM oven/bun AS base
ENV BUN_INSTALL_CACHE_DIR="/root/.cache/bun"

FROM base as build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=s/66da10c3-1afc-4088-a6a1-0192ad7031af-/root/.cache/bun,target=/root/.cache/bun bun install --frozen-lockfile
ARG DATABASE_CONNECTION_URL
ARG DATABASE_AUTH_TOKEN
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_TRUSTED_ORIGINS
ARG RESEND_API_KEY
ARG NOTIFICATIONS_EMAIL_ADDRESS
RUN bun run build --filter app

FROM base
COPY --from=build /app/apps/app/dist /dist
CMD [ "bun", "run", "/dist/index.js" ]
