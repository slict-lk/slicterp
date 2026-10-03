export interface BusinessBranch {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: string;
  isDefault: boolean;
  email?: string | null;
  phone?: string | null;
  currency: string;
  timezone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

