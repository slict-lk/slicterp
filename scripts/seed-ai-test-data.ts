import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Seeding AI Test Data ---');

  // 1. Get Default Tenant (or create if none)
  // Let's specifically find the tenant associated with "Demo User" to ensure testing works with the logged-in session.
  const demoUser = await prisma.user.findFirst({ where: { name: 'Demo User' } });
  
  let tenant: any;
  if (demoUser && demoUser.tenantId) {
    tenant = await prisma.tenant.findUnique({ where: { id: demoUser.tenantId } });
    console.log('Using Demo User tenant:', tenant?.name, tenant?.id);
  } else {
    tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'SLICT Auto Parts',
          subdomain: 'slict',
          companyName: 'SLICT Auto Parts (Pvt) Ltd',
          enabledModules: ['inventory', 'accounting', 'hr', 'projects', 'studio'],
        },
      });
      console.log('Created test tenant:', tenant.id);
    } else {
      console.log('Using existing tenant (first found):', tenant.id);
    }
  }

  // 2. Inventory: Low Stock Product
  const product = await prisma.product.upsert({
    where: { sku: 'PROD-LOW-1' },
    update: {
      stockQty: 4,
      minStockQty: 10,
    },
    create: {
      name: 'Brake Pad Set - Front (Standard)',
      sku: 'PROD-LOW-1',
      type: 'STORABLE',
      category: 'Braking System',
      salePrice: 4500,
      costPrice: 2800,
      stockQty: 4,
      minStockQty: 10,
      tenantId: tenant.id,
    },
  });
  console.log('Seeded Low Stock Product:', product.sku);

  // 3. Accounting: Unpaid Invoices
  // Need a customer first
  let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'Test Customer (AI Testing)',
        email: 'customer@aitest.local',
        tenantId: tenant.id,
      },
    });
    console.log('Created test customer:', customer.id);
  }

  const invoice1 = await prisma.invoice.upsert({
    where: { number: 'INV-2024-001' },
    update: {
      status: 'OPEN',
      total: 3000.25,
      amountDue: 3000.25,
      amountPaid: 0,
    },
    create: {
      number: 'INV-2024-001',
      customerId: customer.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'OPEN',
      subtotal: 3000.25,
      total: 3000.25,
      amountDue: 3000.25,
      amountPaid: 0,
      tenantId: tenant.id,
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { number: 'INV-2024-002' },
    update: {
      status: 'OPEN',
      total: 3250.25,
      amountDue: 3250.25,
      amountPaid: 0,
    },
    create: {
      number: 'INV-2024-002',
      customerId: customer.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'OPEN',
      subtotal: 3250.25,
      total: 3250.25,
      amountDue: 3250.25,
      amountPaid: 0,
      tenantId: tenant.id,
    },
  });
  console.log('Seeded 2 Unpaid Invoices, Total Balance: $6250.50');

  // 4. HR: Employees
  // Need a department first
  let hrDept = await prisma.department.findUnique({ where: { code: 'HR' } });
  if (!hrDept) {
    hrDept = await prisma.department.create({
      data: {
        name: 'Human Resources',
        code: 'HR',
        tenantId: tenant.id,
      },
    });
  }

  const emp1 = await prisma.employee.upsert({
    where: { employeeId: 'EMP101' },
    update: { firstName: 'Sarah', lastName: 'Testing', isActive: true },
    create: {
      firstName: 'Sarah',
      lastName: 'Testing',
      email: 'sarah@aitest.local',
      employeeId: 'EMP101',
      position: 'Sales Representative',
      hireDate: new Date('2023-01-15'),
      departmentId: hrDept.id,
      tenantId: tenant.id,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { employeeId: 'EMP102' },
    update: { firstName: 'Alex', lastName: 'Admin', isActive: true },
    create: {
      firstName: 'Alex',
      lastName: 'Admin',
      email: 'alex@aitest.local',
      employeeId: 'EMP102',
      position: 'HR Manager',
      hireDate: new Date('2022-06-01'),
      departmentId: hrDept.id,
      tenantId: tenant.id,
    },
  });
  console.log('Seeded Employees: Sarah Testing, Alex Admin');

  // 5. Projects: Solar Grid Expansion
  const project = await prisma.project.upsert({
    where: { code: 'SGEXP' },
    update: { status: 'IN_PROGRESS' },
    create: {
      name: 'Solar Grid Expansion',
      code: 'SGEXP',
      description: 'Expansion of the solar energy grid for SLICT facilities.',
      status: 'IN_PROGRESS',
      startDate: new Date('2024-01-01'),
      tenantId: tenant.id,
      budget: 50000,
    },
  });

  // Tasks for the project
  // Need to find which Task model to use, usually it's plain 'Task'
  // But let's check one more time if Task model exists
  const existingTasks = await prisma.task.findMany({ where: { projectId: project.id } });
  if (existingTasks.length === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: 'Infrastructure Site Survey',
          status: 'DONE',
          projectId: project.id,
          tenantId: tenant.id,
          priority: 'HIGH',
        },
        {
          title: 'Panel Installation - Phase 1',
          status: 'TODO',
          projectId: project.id,
          tenantId: tenant.id,
          priority: 'MEDIUM',
        },
      ],
    });
    console.log('Seeded Project Tasks (1 TODO, 1 DONE)');
  }

  console.log('--- Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
