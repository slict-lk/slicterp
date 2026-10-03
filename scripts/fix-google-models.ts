import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not found');

  const pool = new pg.Pool({ 
    connectionString: connectionString.replace('sslmode=require', ''), 
    ssl: { rejectUnauthorized: false } 
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fix the Model ID for "Gemini 3 Pro"
    const updateResult = await prisma.languageModel.updateMany({
      where: { 
        provider: 'GOOGLE',
        name: { contains: 'Gemini 3 Pro', mode: 'insensitive' }
      },
      data: {
        modelId: 'gemini-3-pro-preview'
      }
    });
    
    console.log(`Updated ${updateResult.count} models to "gemini-3-pro-preview".`);

    // 2. Fix the Model ID for "Gemini 3 Pro flash" (seen in user screenshot)
    const updateResultFlash = await prisma.languageModel.updateMany({
      where: { 
        provider: 'GOOGLE',
        name: { contains: 'flash', mode: 'insensitive' },
        NOT: { name: { contains: '2.5' } }
      },
      data: {
        modelId: 'gemini-3-flash-preview'
      }
    });

    console.log(`Updated ${updateResultFlash.count} flash models to "gemini-3-flash-preview".`);

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
