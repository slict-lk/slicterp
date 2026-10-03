require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Testing DB Connection ---');
  try {
    const tenant = await prisma.tenant.findFirst();
    console.log('Tenant found:', tenant ? tenant.id : 'None');
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
