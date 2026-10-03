import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany({ take: 1 });
  console.log('Tenants found:', tenants.length);
  await prisma.$disconnect();
}
main().catch(console.error);
