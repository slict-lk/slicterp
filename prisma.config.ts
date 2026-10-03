/**
 * Prisma v7 Configuration
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 *
 * dotenv is loaded for local CLI usage (migrations, studio, seed).
 * On Vercel / production, env vars are injected by the platform natively.
 */
try {
    require('dotenv').config()
} catch {
    // dotenv not installed — running in production where env vars are provided by the platform
}

import { defineConfig } from 'prisma/config'

export default defineConfig({
    // Explicit schema location (v7 best practice)
    schema: 'prisma/schema.prisma',

    // Centralised migration & seed config (replaces package.json "prisma" section)
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },

    // Database connection — use process.env directly (not env() helper) so
    // `prisma generate` works even when DATABASE_URL is not set (CI type-checks).
    // @see https://www.prisma.io/docs/orm/reference/prisma-config-reference#handling-optional-environment-variables
    datasource: {
        url: process.env.DATABASE_URL ?? '',
    },
})
