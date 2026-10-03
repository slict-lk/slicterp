export type PartyType = 'PERSON' | 'ORGANIZATION';

export interface Party {
  id: string;
  tenantId: string;
  partyType: PartyType;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  taxId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PartyOrganization {
  id: string;
  tenantId: string;
  partyId: string;
  legalName: string;
  tradeName?: string | null;
  registrationNo?: string | null;
  industry?: string | null;
  website?: string | null;
}

export interface PartyPerson {
  id: string;
  tenantId: string;
  partyId: string;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
}

export interface CustomerAccount {
  id: string;
  tenantId: string;
  partyId: string;
  accountCode?: string | null;
  status: string;
  customerType: string;
  creditLimit?: number | null;
  creditHold: boolean;
  paymentTermsDays?: number | null;
  defaultCurrency: string;
  defaultBranchId?: string | null;
  riskLevel: string;
  metadata?: Record<string, unknown> | null;
}

