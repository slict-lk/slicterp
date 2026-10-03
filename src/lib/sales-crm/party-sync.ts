import prisma from '@/lib/prisma';

const client = prisma as any;

type SyncSource = 'sales_customer' | 'export_customer';

function normalizeString(value: unknown) {
  if (value == null) return null;
  const v = String(value).trim();
  return v.length ? v : null;
}

async function findExistingPartyByContact(tenantId: string, input: {
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
}) {
  const clauses: any[] = [];
  if (input.email) clauses.push({ primaryEmail: input.email });
  if (input.phone) clauses.push({ primaryPhone: input.phone });
  if (input.taxId) clauses.push({ taxId: input.taxId });
  if (clauses.length === 0) return null;

  return client.party.findFirst({
    where: {
      tenantId,
      OR: clauses,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function ensurePartyForCustomerRecord(input: {
  tenantId: string;
  customerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  type?: string | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  branchId?: string | null;
}) {
  const tenantId = input.tenantId;
  const email = normalizeString(input.email);
  const phone = normalizeString(input.phone);
  const taxId = normalizeString(input.taxId);
  const isOrg = (input.type || 'INDIVIDUAL') === 'COMPANY';

  const customer = await client.customer.findFirst({
    where: { id: input.customerId, tenantId },
    select: { id: true, partyId: true },
  });
  if (!customer) throw new Error('Customer not found for party sync');

  let party = customer.partyId
    ? await client.party.findFirst({ where: { id: customer.partyId, tenantId } })
    : null;

  if (!party) {
    party = await findExistingPartyByContact(tenantId, { email, phone, taxId });
  }

  if (!party) {
    party = await client.party.create({
      data: {
        tenantId,
        partyType: isOrg ? 'ORGANIZATION' : 'PERSON',
        displayName: input.name,
        primaryEmail: email,
        primaryPhone: phone,
        taxId,
        status: 'ACTIVE',
      },
    });
  } else {
    party = await client.party.update({
      where: { id: party.id },
      data: {
        partyType: isOrg ? 'ORGANIZATION' : party.partyType,
        displayName: input.name || party.displayName,
        primaryEmail: email ?? party.primaryEmail,
        primaryPhone: phone ?? party.primaryPhone,
        taxId: taxId ?? party.taxId,
      },
    });
  }

  if (!customer.partyId || customer.partyId !== party.id) {
    await client.customer.update({
      where: { id: customer.id },
      data: { partyId: party.id },
    });
  }

  if (isOrg) {
    const org = await client.partyOrganization.findFirst({
      where: { tenantId, partyId: party.id },
    });
    if (!org) {
      await client.partyOrganization.create({
        data: {
          tenantId,
          partyId: party.id,
          legalName: input.name,
        },
      });
    } else if (org.legalName !== input.name) {
      await client.partyOrganization.update({
        where: { id: org.id },
        data: { legalName: input.name },
      });
    }
  } else {
    const person = await client.partyPerson.findFirst({
      where: { tenantId, partyId: party.id },
    });
    if (!person) {
      await client.partyPerson.create({
        data: {
          tenantId,
          partyId: party.id,
          firstName: input.name,
          isPrimary: true,
        },
      });
    }
  }

  if (input.address?.line1) {
    const primaryAddress = await client.partyAddress.findFirst({
      where: { tenantId, partyId: party.id, isPrimary: true },
      orderBy: { createdAt: 'asc' },
    });
    const addressData = {
      label: 'Billing',
      addressType: 'BILLING',
      line1: input.address.line1,
      city: normalizeString(input.address.city),
      state: normalizeString(input.address.state),
      postalCode: normalizeString(input.address.postalCode),
      country: normalizeString(input.address.country),
      isPrimary: true,
    };
    if (!primaryAddress) {
      await client.partyAddress.create({ data: { tenantId, partyId: party.id, ...addressData } });
    } else {
      await client.partyAddress.update({ where: { id: primaryAddress.id }, data: addressData });
    }
  }

  let account = await client.customerAccount.findFirst({
    where: { tenantId, partyId: party.id },
  });
  if (!account) {
    account = await client.customerAccount.create({
      data: {
        tenantId,
        partyId: party.id,
        status: 'ACTIVE',
        customerType: 'GENERAL',
        defaultBranchId: input.branchId ?? null,
        defaultCurrency: 'USD',
        metadata: { source: 'sales_customer_sync' },
      },
    });
  } else if (input.branchId && account.defaultBranchId !== input.branchId) {
    account = await client.customerAccount.update({
      where: { id: account.id },
      data: { defaultBranchId: input.branchId },
    });
  }

  return { party, customerAccount: account };
}

export async function ensurePartyForExportCustomerRecord(input: {
  tenantId: string;
  exportCustomerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  country?: string | null;
  address?: string | null;
  branchId?: string | null;
}) {
  const tenantId = input.tenantId;
  const email = normalizeString(input.email);
  const phone = normalizeString(input.phone);
  const isOrg = !!normalizeString(input.company);

  const exportCustomer = await client.exportCustomer.findFirst({
    where: { id: input.exportCustomerId, tenantId },
    select: { id: true, partyId: true },
  });
  if (!exportCustomer) throw new Error('Export customer not found for party sync');

  let party = exportCustomer.partyId
    ? await client.party.findFirst({ where: { id: exportCustomer.partyId, tenantId } })
    : null;

  if (!party) {
    party = await findExistingPartyByContact(tenantId, { email, phone, taxId: null });
  }

  if (!party) {
    party = await client.party.create({
      data: {
        tenantId,
        partyType: isOrg ? 'ORGANIZATION' : 'PERSON',
        displayName: input.company || input.name,
        primaryEmail: email,
        primaryPhone: phone,
        status: 'ACTIVE',
      },
    });
  } else {
    party = await client.party.update({
      where: { id: party.id },
      data: {
        displayName: input.company || input.name || party.displayName,
        primaryEmail: email ?? party.primaryEmail,
        primaryPhone: phone ?? party.primaryPhone,
      },
    });
  }

  if (!exportCustomer.partyId || exportCustomer.partyId !== party.id) {
    await client.exportCustomer.update({
      where: { id: exportCustomer.id },
      data: { partyId: party.id },
    });
  }

  let account = await client.customerAccount.findFirst({
    where: { tenantId, partyId: party.id },
  });
  if (!account) {
    account = await client.customerAccount.create({
      data: {
        tenantId,
        partyId: party.id,
        status: 'ACTIVE',
        customerType: 'EXPORT',
        defaultBranchId: input.branchId ?? null,
        defaultCurrency: 'USD',
        metadata: { source: 'export_customer_sync' },
      },
    });
  }

  return { party, customerAccount: account };
}

export async function backfillPartyAndCustomerAccountsForTenant(tenantId: string, defaultBranchId?: string | null) {
  const salesCustomers = await client.customer.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  const exportCustomers = await client.exportCustomer.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });

  let salesCount = 0;
  let exportCount = 0;

  for (const c of salesCustomers) {
    await ensurePartyForCustomerRecord({
      tenantId,
      customerId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      type: c.type,
      address: {
        line1: c.address ?? null,
        city: c.city ?? null,
        state: c.state ?? null,
        postalCode: c.zipCode ?? null,
        country: c.country ?? null,
      },
      branchId: defaultBranchId ?? null,
    });
    salesCount++;
  }

  for (const c of exportCustomers) {
    await ensurePartyForExportCustomerRecord({
      tenantId,
      exportCustomerId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      country: c.country,
      address: c.address,
      branchId: defaultBranchId ?? null,
    });
    exportCount++;
  }

  return { salesCount, exportCount };
}

