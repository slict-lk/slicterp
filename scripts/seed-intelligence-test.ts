import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

type TenantProfile = 'clean' | 'messy' | 'marginal';

const CONFIRM_FLAG = '--confirm-write';
const HARNESS_MARKER = 'intelligenceTestHarness';

const TENANTS: Array<{ subdomain: string; name: string; profile: TenantProfile }> = [
  { subdomain: 'tenant-clean', name: 'Intelligence Clean Tenant', profile: 'clean' },
  { subdomain: 'tenant-messy', name: 'Intelligence Messy Tenant', profile: 'messy' },
  { subdomain: 'tenant-marginal', name: 'Intelligence Marginal Tenant', profile: 'marginal' },
];

const BASE_DATE = new Date('2026-05-18T09:00:00.000Z');

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  const { default: prisma } = await import('../src/lib/prisma');
  const confirmed = process.argv.includes(CONFIRM_FLAG);

  if (!confirmed) {
    console.log('Intelligence test seed is in dry-run mode.');
    console.log(`No data was written. Re-run with ${CONFIRM_FLAG} to create/reset only marked sandbox tenants.`);
    console.log('');
    console.log('Planned sandbox tenants:');
    TENANTS.forEach((tenant) => console.log(`- ${tenant.subdomain} (${tenant.profile})`));
    return;
  }

  for (const tenantConfig of TENANTS) {
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantConfig.subdomain },
      select: { id: true, subdomain: true, settings: true },
    });

    if (existingTenant && !isHarnessTenant(existingTenant.settings)) {
      throw new Error(
        `Refusing to modify existing tenant "${tenantConfig.subdomain}" because it is not marked as an intelligence test harness tenant.`
      );
    }

    const markerSettings = {
      [HARNESS_MARKER]: true,
      profile: tenantConfig.profile,
      seededBy: 'scripts/seed-intelligence-test.ts',
      updatedAt: new Date().toISOString(),
    };

    const tenant = existingTenant
      ? await prisma.tenant.update({
        where: { id: existingTenant.id },
        data: {
          name: tenantConfig.name,
          companyName: tenantConfig.name,
          status: 'ACTIVE',
          plan: 'enterprise',
          enabledModules: ['hr', 'projects', 'sales'],
          settings: markerSettings,
        },
      })
      : await prisma.tenant.create({
        data: {
          name: tenantConfig.name,
          companyName: tenantConfig.name,
          subdomain: tenantConfig.subdomain,
          status: 'ACTIVE',
          plan: 'enterprise',
          enabledModules: ['hr', 'projects', 'sales'],
          settings: markerSettings,
        },
      });

    await resetTenant(prisma, tenant.id);
    await seedProfile(prisma, tenant.id, tenantConfig.subdomain, tenantConfig.profile);
    console.log(`Seeded ${tenantConfig.subdomain} (${tenantConfig.profile})`);
  }
}

function isHarnessTenant(settings: unknown) {
  return Boolean(
    settings &&
    typeof settings === 'object' &&
    HARNESS_MARKER in settings &&
    (settings as Record<string, unknown>)[HARNESS_MARKER] === true
  );
}

async function resetTenant(prisma: any, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true, settings: true },
  });

  if (!tenant || !isHarnessTenant(tenant.settings)) {
    throw new Error(`Refusing to reset tenant ${tenantId}; missing intelligence test harness marker.`);
  }

  await prisma.$transaction([
    prisma.salesOrderApproval.deleteMany({ where: { tenantId } }),
    prisma.salesOrderV2.deleteMany({ where: { tenantId } }),
    prisma.task.deleteMany({ where: { tenantId } }),
    prisma.project.deleteMany({ where: { tenantId } }),
    prisma.attendance.deleteMany({ where: { tenantId } }),
    prisma.user.deleteMany({ where: { tenantId } }),
    prisma.employee.deleteMany({ where: { tenantId } }),
    prisma.department.deleteMany({ where: { tenantId } }),
  ]);
}

async function seedProfile(
  prisma: any,
  tenantId: string,
  subdomain: string,
  profile: TenantProfile
) {
  const departments = await createDepartments(prisma, tenantId, subdomain);
  const employees = await createEmployees(prisma, tenantId, subdomain, departments, profile);
  const users = await createUsers(prisma, tenantId, subdomain, employees, profile);

  await linkDepartmentsToManagers(prisma, departments, employees, profile);
  await createAttendance(prisma, tenantId, employees, profile);
  await createTasks(prisma, tenantId, subdomain, users, profile);
  await createApprovalTrail(prisma, tenantId, subdomain, users, profile);
}

async function createDepartments(prisma: any, tenantId: string, subdomain: string) {
  const departmentInputs = [
    { name: 'Executive Office', code: `${subdomain}-EXEC` },
    { name: 'Operations', code: `${subdomain}-OPS` },
    { name: 'Sales', code: `${subdomain}-SALES` },
  ];

  const departments = [];
  for (const department of departmentInputs) {
    departments.push(await prisma.department.create({
      data: {
        tenantId,
        name: department.name,
        code: department.code,
      },
    }));
  }

  return departments;
}

async function createEmployees(
  prisma: any,
  tenantId: string,
  subdomain: string,
  departments: any[],
  profile: TenantProfile
) {
  const employeeInputs = [
    { firstName: 'Asha', lastName: 'Perera', position: 'General Manager', departmentIndex: 0 },
    { firstName: 'Nimal', lastName: 'Fernando', position: 'Operations Manager', departmentIndex: 1 },
    { firstName: 'Maya', lastName: 'Silva', position: 'Sales Manager', departmentIndex: 2 },
    { firstName: 'Kamal', lastName: 'Jayasinghe', position: 'Inventory Coordinator', departmentIndex: 1 },
    { firstName: 'Ravi', lastName: 'Wijesinghe', position: 'Sales Executive', departmentIndex: 2 },
    { firstName: 'Ishara', lastName: 'Dias', position: 'Operations Analyst', departmentIndex: 1 },
  ];

  const employees = [];
  for (let index = 0; index < employeeInputs.length; index += 1) {
    const input = employeeInputs[index];
    const shouldDropDepartment = profile === 'messy' && index >= 4;

    employees.push(await prisma.employee.create({
      data: {
        tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: `${input.firstName.toLowerCase()}.${subdomain}@example.com`,
        employeeId: `${subdomain.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        position: input.position,
        hireDate: new Date('2024-01-01T00:00:00.000Z'),
        departmentId: shouldDropDepartment ? null : departments[input.departmentIndex].id,
        isActive: true,
      },
    }));
  }

  const managerByIndex = [null, 0, 0, 1, 2, 1];
  for (let index = 0; index < employees.length; index += 1) {
    const managerIndex = managerByIndex[index];
    const shouldDropManager = profile === 'messy' && index >= 3;

    if (managerIndex !== null && !shouldDropManager) {
      employees[index] = await prisma.employee.update({
        where: { id: employees[index].id },
        data: { managerId: employees[managerIndex].id },
      });
    }
  }

  return employees;
}

async function createUsers(
  prisma: any,
  tenantId: string,
  subdomain: string,
  employees: any[],
  profile: TenantProfile
) {
  const users = [];
  const linkedEmployeeCount = profile === 'messy' ? 4 : employees.length;

  for (let index = 0; index < linkedEmployeeCount; index += 1) {
    const employee = employees[index];
    users.push(await prisma.user.create({
      data: {
        tenantId,
        name: `${employee.firstName} ${employee.lastName}`,
        email: `user.${index + 1}.${subdomain}@example.com`,
        password: 'seeded-intelligence-test-password',
        role: index === 0 ? 'ADMIN' : 'USER',
        isActive: true,
        employeeId: employee.id,
      },
    }));
  }

  return users;
}

async function linkDepartmentsToManagers(
  prisma: any,
  departments: any[],
  employees: any[],
  profile: TenantProfile
) {
  const managerIndexes = profile === 'messy' ? [0] : [0, 1, 2];

  for (let index = 0; index < managerIndexes.length; index += 1) {
    await prisma.department.update({
      where: { id: departments[index].id },
      data: { managerId: employees[managerIndexes[index]].id },
    });
  }
}

async function createAttendance(
  prisma: any,
  tenantId: string,
  employees: any[],
  profile: TenantProfile
) {
  for (let employeeIndex = 0; employeeIndex < employees.length; employeeIndex += 1) {
    const employee = employees[employeeIndex];

    for (let day = 0; day < 5; day += 1) {
      const checkIn = addDays(BASE_DATE, day);
      let checkOut = addHours(checkIn, 8);

      if (profile === 'messy' && day < 3) {
        checkOut = addHours(checkIn, 48);
      }

      if (profile === 'marginal' && employeeIndex === 0 && day === 0) {
        checkOut = addHours(checkIn, 20);
      }

      await prisma.attendance.create({
        data: {
          tenantId,
          employeeId: employee.id,
          date: addDays(new Date('2026-05-18T00:00:00.000Z'), day),
          checkIn,
          checkOut,
          status: 'PRESENT',
        },
      });
    }
  }
}

async function createTasks(
  prisma: any,
  tenantId: string,
  subdomain: string,
  users: any[],
  profile: TenantProfile
) {
  const project = await prisma.project.create({
    data: {
      tenantId,
      name: `${subdomain} Operations Readiness`,
      code: `${subdomain}-PROJ`,
      status: 'IN_PROGRESS',
      startDate: BASE_DATE,
      managerId: users[0]?.id,
    },
  });

  const taskCount = 10;
  for (let index = 0; index < taskCount; index += 1) {
    const isMessy = profile === 'messy';
    const marginalMissingDueDate = profile === 'marginal' && index >= 5;

    await prisma.task.create({
      data: {
        tenantId,
        projectId: project.id,
        title: `${subdomain} readiness task ${index + 1}`,
        status: index < 5 ? 'DONE' : 'IN_PROGRESS',
        assigneeId: isMessy ? null : users[(index % users.length)]?.id,
        dueDate: isMessy || marginalMissingDueDate ? null : addDays(BASE_DATE, index + 1),
        completedAt: index < 5 ? addDays(BASE_DATE, index + 1) : null,
      },
    });
  }
}

async function createApprovalTrail(
  prisma: any,
  tenantId: string,
  subdomain: string,
  users: any[],
  profile: TenantProfile
) {
  const orderCount = profile === 'marginal' ? 4 : 6;

  for (let index = 0; index < orderCount; index += 1) {
    const order = await prisma.salesOrderV2.create({
      data: {
        tenantId,
        orderNumber: `${subdomain.toUpperCase()}-SO-${String(index + 1).padStart(3, '0')}`,
        status: 'CONFIRMED',
        approvalStatus: profile === 'messy' ? 'PENDING' : 'APPROVED',
        currency: 'LKR',
        orderDate: addDays(BASE_DATE, index),
        subtotal: 10000,
        grandTotal: 10000,
        createdByUserId: profile === 'messy' ? null : users[index % users.length]?.id,
      },
    });

    const completed = profile === 'clean' || (profile === 'marginal' && index < 2);
    await prisma.salesOrderApproval.create({
      data: {
        tenantId,
        salesOrderId: order.id,
        status: completed ? 'APPROVED' : 'PENDING',
        ruleCode: 'INTELLIGENCE_TEST_APPROVAL',
        reason: 'Seeded process trail for intelligence readiness testing',
        requestedByUserId: users[index % users.length]?.id,
        approverUserId: completed ? users[0]?.id : null,
        decidedAt: completed ? addDays(BASE_DATE, index + 1) : null,
      },
    });
  }
}

main().catch(async (error) => {
  console.error('Failed to seed intelligence test tenants.');
  console.error(error);

  const { default: prisma } = await import('../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});
