# Web image. Build from the repository root:
#   docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
# The /uploads rewrite is fixed at build time, so the API address must be
# known here. Inside the compose network the API is simply "api".
ARG API_URL=http://api:3001/api
ENV API_URL=$API_URL
# NEXT_PUBLIC_* values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_CONTACT_PHONE=
ENV NEXT_PUBLIC_CONTACT_PHONE=$NEXT_PUBLIC_CONTACT_PHONE
ENV NEXT_TELEMETRY_DISABLED=1
# Nested workspace files in apps/web would make pnpm treat it as its own root.
RUN rm -f apps/web/pnpm-workspace.yaml apps/web/pnpm-lock.yaml \
  && pnpm --filter @iqbol/shared build \
  && pnpm --filter @iqbol/web build

FROM base AS run
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
