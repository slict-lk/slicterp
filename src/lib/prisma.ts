import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaPool?: pg.Pool;
};

// Create Prisma Client instance using the Prisma 7 adapter pattern.
// Prisma 7 uses the "client" engine, which requires a driver adapter.
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Strip sslmode from URL — pg Pool handles SSL via its own config object,
  // and having it in the URL can conflict with the adapter.
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  const cleanedUrl = url.toString();

  // SSL Configuration for Aiven / Managed Postgres
  let sslConfig: any = {
    rejectUnauthorized: false, // Aiven uses self-signed certs
  };

  if (process.env.DISABLE_SSL_VERIFY === 'true') {
    sslConfig = false;
  }

  if (sslConfig && process.env.AIVEN_CA_CERT) {
    sslConfig.ca = process.env.AIVEN_CA_CERT;
    sslConfig.rejectUnauthorized = true;
  }

  // Optimize pool configuration for serverless (Vercel)
  const isServerless = process.env.VERCEL === '1' || !process.env.LOCAL_DEV;
  const maxConnections = isServerless ? 1 : (process.env.NODE_ENV === 'development' ? 2 : 5);

  const pool =
    globalForPrisma.prismaPool ??
    new pg.Pool({
      connectionString: cleanedUrl,
      // Serverless: use minimal connections; traditional: use more
      max: maxConnections,
      idleTimeoutMillis: isServerless ? 10000 : 30000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 30000, // 30s query timeout
      ssl: sslConfig,
    });

  // Handle pool errors
  pool.on('error', (error) => {
    console.error('[Prisma Pool] Unexpected error on idle client:', error);
  });

  globalForPrisma.prismaPool = pool;

  const adapter = new PrismaPg(pool);

  console.log(`[Prisma] Initializing client with pg adapter (Prisma 7) - Serverless: ${isServerless}`);

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    adapter,
  });

  return client;
};

// Use cached instance or create new one
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache in-process so route handlers and auth callbacks share one client/pool.
globalForPrisma.prisma = prisma;


// Connection health check helper
export async function testDatabaseConnection(retries = 3): Promise<boolean> {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed:`, error);

      if (attempt === retries) {
        return false;
      }

      // Exponential backoff: 1s, 2s, 4s
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Retrying in ${waitTime}ms...`);
      await delay(waitTime);
    }
  }

  return false;
}

export default prisma;
