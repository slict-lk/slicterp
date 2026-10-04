import { isValidClassificationCode } from './serial-number';
import { normalizeTin } from './tin';

/**
 * A tenant opts in by setting `Tenant.settings.taxInvoice`:
 *
 *   { "enabled": true, "classificationCode": "HQ",
 *     "registeredName": "...", "registeredAddress": "..." }
 *
 * The supplier TIN comes from `Tenant.taxRegistrationNumber`. Name and address
 * are held separately because the invoice must show them exactly as on the VAT
 * registration certificate (SEC/2026/E/03 s.4.2), which need not match the
 * display name the tenant uses elsewhere in the app.
 */
export type TaxInvoiceSettings =
  | { enabled: false }
  | {
      enabled: true;
      classificationCode: string;
      supplierTin: string;
      registeredName: string;
      registeredAddress: string;
    };

export type TaxInvoiceSettingsResult =
  | { ok: true; settings: TaxInvoiceSettings }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Absent or disabled leaves the tenant's invoicing unchanged. Enabled but
 * incomplete is an error, never a silent fallback: a tenant that has opted in
 * must not issue an invoice that looks compliant but is missing particulars.
 */
export function readTaxInvoiceSettings(tenant: {
  settings: unknown;
  taxRegistrationNumber: string | null;
}): TaxInvoiceSettingsResult {
  const raw = isRecord(tenant.settings) ? tenant.settings.taxInvoice : undefined;
  if (!isRecord(raw) || raw.enabled !== true) {
    return { ok: true, settings: { enabled: false } };
  }

  const errors: string[] = [];
  const classificationCode = text(raw.classificationCode);
  if (!isValidClassificationCode(classificationCode)) {
    errors.push('classificationCode must be 1-15 letters or digits');
  }
  const supplierTin = normalizeTin(tenant.taxRegistrationNumber);
  if (!supplierTin) {
    errors.push("The tenant's taxRegistrationNumber must be its 9-digit TIN");
  }
  const registeredName = text(raw.registeredName);
  if (!registeredName) {
    errors.push('registeredName is required, exactly as on the VAT registration certificate');
  }
  const registeredAddress = text(raw.registeredAddress);
  if (!registeredAddress) {
    errors.push('registeredAddress is required, exactly as on the VAT registration certificate');
  }

  if (errors.length > 0 || !supplierTin) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    settings: { enabled: true, classificationCode, supplierTin, registeredName, registeredAddress },
  };
}
