# API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS base
# ffmpeg/ffprobe: uploaded videos are prepared for smooth playback everywhere.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @iqbol/shared build \
  && pnpm --filter @iqbol/api prisma:generate \
  && pnpm --filter @iqbol/api build

FROM base AS run
ENV NODE_ENV=production
# Weddings are in Tashkent; logs and any local-time code agree with that.
ENV TZ=Asia/Tashkent
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
# Apply pending migrations, then start.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/src/main"]
