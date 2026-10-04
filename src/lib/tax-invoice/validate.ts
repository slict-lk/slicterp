import { normalizeTin } from './tin';

// The circular's own examples of descriptions that are too vague (SEC/2026/E/03
// s.4.6), plus their singular forms - the invoice form currently saves a blank
// description as "Item".
const VAGUE_DESCRIPTIONS = new Set(['item', 'items', 'product', 'products', 'service', 'services', 'miscellaneous']);

/** Every line must say what was supplied and in what quantity (SEC/2026/E/03 s.4.6). */
export function validateTaxInvoiceLines(lines: ReadonlyArray<{ description?: unknown; quantity?: unknown }>): string[] {
  if (lines.length === 0) {
    return ['A tax invoice needs at least one line describing what was supplied'];
  }
  const errors: string[] = [];
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const description = typeof line.description === 'string' ? line.description.trim() : '';
    if (!description) {
      errors.push(`${label}: a description of the goods or services is required`);
    } else if (VAGUE_DESCRIPTIONS.has(description.toLowerCase())) {
      errors.push(`${label}: "${description}" is too vague - describe what was actually supplied`);
    }
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`${label}: quantity must be greater than zero`);
    }
  });
  return errors;
}

/**
 * Where the purchaser is VAT-registered, the invoice must carry their TIN, name
 * and address (SEC/2026/E/03 s.4.3) - without them the purchaser cannot claim
 * input VAT. A customer with a tax registration number on file is treated as
 * VAT-registered; one without is not, and their particulars are optional.
 */
export function validatePurchaser(customer: {
  name: string | null;
  address: string | null;
  taxRegistrationNumber: string | null;
}): string[] {
  if (!customer.taxRegistrationNumber?.trim()) {
    return [];
  }
  const errors: string[] = [];
  if (!normalizeTin(customer.taxRegistrationNumber)) {
    errors.push("The customer's TIN must be exactly 9 digits");
  }
  if (!customer.name?.trim()) {
    errors.push("The customer's name is required because they are VAT-registered");
  }
  if (!customer.address?.trim()) {
    errors.push("The customer's address is required because they are VAT-registered");
  }
  return errors;
}
