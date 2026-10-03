require('dotenv').config();
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
const { PrismaClient } = require('@prisma/client');
try {
  const prisma = new PrismaClient();
  console.log('Prisma Client initialized successfully');
} catch (err) {
  console.error('Failed to initialize Prisma Client:', err.message);
}
