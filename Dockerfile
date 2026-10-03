

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm config set node-linker hoisted
RUN pnpm config set package-import-method copy
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build-placeholder:build-placeholder@127.0.0.1:5432/build_placeholder?sslmode=disable
ENV NEXTAUTH_SECRET=build-only-placeholder-nextauth-secret
ENV CRON_SECRET=build-only-placeholder-cron-secret
ENV SKIP_ENV_VALIDATION=1
RUN pnpm prisma generate
RUN pnpm build

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]
