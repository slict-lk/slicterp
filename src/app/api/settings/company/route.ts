import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { Tenant } from '@prisma/client';


export const dynamic = 'force-dynamic';
type BusinessHourEntry = {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type TenantSettings = {
  registrationNumber?: string;
  industry?: string;
  foundedYear?: string;
  website?: string;
  description?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  vatNumber?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  businessHours?: BusinessHourEntry[];
  logo?: string;
  signature?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  [key: string]: unknown;
};

const DEFAULT_BUSINESS_HOURS: BusinessHourEntry[] = [
  { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Saturday', isOpen: false, openTime: '09:00', closeTime: '13:00' },
  { day: 'Sunday', isOpen: false, openTime: '', closeTime: '' },
];

function normalizeCompanyResponse(tenant: Tenant | null) {
  const rawSettings = (tenant?.settings ?? {}) as TenantSettings;
  const settings = typeof rawSettings === 'object' && rawSettings !== null ? rawSettings : {};

  const businessHours = Array.isArray(settings.businessHours) && settings.businessHours.length > 0
    ? settings.businessHours.map((entry: Partial<BusinessHourEntry>) => ({
        day: entry?.day ?? '',
        isOpen: Boolean(entry?.isOpen),
        openTime: entry?.openTime ?? '',
        closeTime: entry?.closeTime ?? '',
      }))
    : DEFAULT_BUSINESS_HOURS.map((entry) => ({ ...entry }));

  return {
    companyName: tenant?.companyName || tenant?.name || '',
    legalName: tenant?.companyName || tenant?.name || '',
    registrationNumber: settings.registrationNumber ?? '',
    industry: settings.industry ?? '',
    foundedYear: settings.foundedYear ?? '',
    website: settings.website ?? tenant?.domain ?? '',
    description: settings.description ?? '',
    email: settings.email ?? '',
    phone: settings.phone ?? '',
    fax: settings.fax ?? '',
    address: settings.address ?? '',
    city: settings.city ?? '',
    state: settings.state ?? '',
    postalCode: settings.postalCode ?? '',
    country: settings.country ?? 'US',
    taxId: settings.taxId ?? '',
    vatNumber: settings.vatNumber ?? '',
    bankName: settings.bankName ?? '',
    accountName: settings.accountName ?? '',
    accountNumber: settings.accountNumber ?? '',
    routingNumber: settings.routingNumber ?? '',
    iban: settings.iban ?? '',
    swiftCode: settings.swiftCode ?? '',
    facebook: settings.facebook ?? '',
    twitter: settings.twitter ?? '',
    linkedin: settings.linkedin ?? '',
    instagram: settings.instagram ?? '',
    businessHours,
    logo: tenant?.logo ? '/api/settings/company/logo' : '',
    signature: settings.signature ?? '',
    termsAndConditions: settings.termsAndConditions ?? '',
    privacyPolicy: settings.privacyPolicy ?? '',
  };
}

export async function GET(_request: NextRequest) {
  return tryCatch(async () => {
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      console.error('❌ No authenticated user found. Please log in.');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to access company settings' },
        { status: 401 }
      );
    }

    console.log('✅ Fetching company settings for tenant:', user.tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      console.error('❌ Tenant not found:', user.tenantId);
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(normalizeCompanyResponse(tenant));
  }, 'Failed to fetch company settings');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const user = await getCurrentUser();
    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

    if (!isAdmin) {
      console.error('Permission denied for user:', {
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      });
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can update company settings.' },
        { status: 403 }
      );
    }

    const body = await request.json() as Record<string, unknown>;

    // Update tenant basic info (logo is handled separately via /api/settings/company/logo)
    const updateData: Partial<Pick<Tenant, 'companyName' | 'name' | 'domain'>> = {
      companyName: (body.companyName as string | undefined) || undefined,
      name: (body.legalName as string | undefined) || (body.companyName as string | undefined) || undefined,
    };

    if (body.website) updateData.domain = body.website as string;

    // Build settings JSON with all form fields
    const settings: Record<string, unknown> = {};

    // Contact
    if (body.email) settings.email = body.email;
    if (body.phone) settings.phone = body.phone;
    if (body.fax) settings.fax = body.fax;

    // Address
    if (body.address) settings.address = body.address;
    if (body.city) settings.city = body.city;
    if (body.state) settings.state = body.state;
    if (body.postalCode) settings.postalCode = body.postalCode;
    if (body.country) settings.country = body.country;

    // Tax
    if (body.taxId) settings.taxId = body.taxId;
    if (body.vatNumber) settings.vatNumber = body.vatNumber;

    // Bank
    if (body.bankName) settings.bankName = body.bankName;
    if (body.accountName) settings.accountName = body.accountName;
    if (body.accountNumber) settings.accountNumber = body.accountNumber;
    if (body.routingNumber) settings.routingNumber = body.routingNumber;
    if (body.iban) settings.iban = body.iban;
    if (body.swiftCode) settings.swiftCode = body.swiftCode;

    // Social
    if (body.facebook) settings.facebook = body.facebook;
    if (body.twitter) settings.twitter = body.twitter;
    if (body.linkedin) settings.linkedin = body.linkedin;
    if (body.instagram) settings.instagram = body.instagram;

    // Other
    if (body.registrationNumber) settings.registrationNumber = body.registrationNumber;
    if (body.industry) settings.industry = body.industry;
    if (body.foundedYear) settings.foundedYear = body.foundedYear;
    if (body.description) settings.description = body.description;
    if (body.signature) settings.signature = body.signature;
    if (body.termsAndConditions) settings.termsAndConditions = body.termsAndConditions;
    if (body.privacyPolicy) settings.privacyPolicy = body.privacyPolicy;

    // Business hours
    if (Array.isArray(body.businessHours)) {
      settings.businessHours = body.businessHours;
    }

    // Update tenant with basic info and merge settings
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true },
    });
    const existingSettings = (existingTenant?.settings as Record<string, unknown>) || {};

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        ...updateData,
        settings: { ...existingSettings, ...settings } as any,
      },
    });

    return NextResponse.json(
      formatSuccessResponse({}, 'Company settings saved successfully')
    );
  }, 'Failed to save company settings');
}

