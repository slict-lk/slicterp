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
    const models = await prisma.languageModel.findMany({ 
      where: { provider: 'GOOGLE' } 
    });
    
    console.log(`Found ${models.length} Google model configurations.`);
    
    for (const modelConfig of models) {
      console.log(`\nChecking access for: ${modelConfig.name} (${modelConfig.modelId})`);
      if (!modelConfig.apiKey) {
        console.log('Skipping - no API key provided.');
        continue;
      }
      
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${modelConfig.apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Successful access! Available models:');
          data.models.forEach((m: any) => {
            console.log(` - ${m.name} (${m.displayName})`);
          });
        } else {
          const err = await response.json();
          console.log(`❌ Failed: ${err.error?.message || response.statusText}`);
        }
      } catch (e: any) {
        console.log(`❌ Network Error: ${e.message}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
