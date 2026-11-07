# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.3

# deps
FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN mkdir -p apps/web apps/api packages/shared \
	&& bun install --frozen-lockfile

# build
FROM deps AS build
WORKDIR /app

COPY . .
ARG SITE_URL=https://tigasearah.my.id
ENV SITE_URL=${SITE_URL} \
	NODE_ENV=production \
	ASTRO_TELEMETRY_DISABLED=1 \
	TURBO_TELEMETRY_DISABLED=1 \
	DO_NOT_TRACK=1
RUN bun run build

# runtime
FROM oven/bun:${BUN_VERSION}-distroless AS runtime
WORKDIR /app

ENV NODE_ENV=production \
	BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
	PORT=3000 \
	HOST=0.0.0.0

COPY --from=build --chown=65532:65532 /app/apps/api/.output ./

USER nonroot:65532
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.PORT||3000}/`).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT []
CMD ["bun", "server/index.mjs"]
