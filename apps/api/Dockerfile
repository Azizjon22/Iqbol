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
ENV TZ=Asia/Tashkent
# TEST ENV — rotate these creds before any real use
ENV DATABASE_URL="postgresql://postgres:uzUnJFkjDDJwerGONFwTYGdpxmAkDECk@postgres.railway.internal:5432/railway"
ENV JWT_ACCESS_SECRET="test-jwt-access-secret-change-before-prod"
ENV JWT_REFRESH_SECRET="test-jwt-refresh-secret-change-before-prod"
ENV JWT_ACCESS_TTL="15m"
ENV JWT_REFRESH_TTL="30d"
ENV PORT=3001
ENV S3_ENDPOINT="https://t3.storageapi.dev"
ENV S3_REGION="auto"
ENV S3_BUCKET="roomy-room-isg3shja2qfa12"
ENV S3_ACCESS_KEY_ID="tid_kEZdIqEhxhDoTkGyUUEclOWpLwWQcihypoDhUQwLefDKXFlorr"
ENV S3_SECRET_ACCESS_KEY="tsec_RgJZ7-N4cjfxY-xsLWcPuEd8DZVqHGA8Qb_tsYeQDXx0ga8zTx7FUUXPF6KmZapn-5GH2L"
ENV S3_PUBLIC_BASE_URL="https://t3.storageapi.dev/roomy-room-isg3shja2qfa12"
ENV SEED_SUPER_ADMIN_PHONE="+998901234567"
ENV SEED_SUPER_ADMIN_PASSWORD="TestAdmin2024!"
ENV WEB_ORIGIN="https://cooperative-strength-production-e477.up.railway.app"
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
# Apply pending migrations, then start.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed && node dist/src/main"]
