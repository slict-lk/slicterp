import { serialDatePrefix } from './colombo-date';

/**
 * Tax invoice serial numbers in the format prescribed by Gazette 2481/22 and
 * explained in Circular SEC/2026/E/03 s.4.4: `YYMMM_QQQQ_XXXXX`.
 *
 *   YYMMM  date stamp in Asia/Colombo, e.g. 26OCT
 *   QQQQ   classification code chosen by the business (branch, device, invoice type)
 *   XXXXX  sequential digits, continuing from the last invoice issued
 */

// QQQQ may be letters, digits or both, 1-15 characters. Underscores are excluded
// because they delimit the three parts of the number.
const CLASSIFICATION_CODE = /^[A-Za-z0-9]{1,15}$/;
const MAX_LENGTH = 40;
const SEQUENCE_WIDTH = 5;

export function isValidClassificationCode(code: string): boolean {
  return CLASSIFICATION_CODE.test(code);
}

export function formatTaxInvoiceNumber(input: {
  issuedAt: Date;
  classificationCode: string;
  sequence: number;
}): string {
  const { issuedAt, classificationCode, sequence } = input;
  if (!isValidClassificationCode(classificationCode)) {
    throw new Error(`Invalid tax invoice classification code: ${JSON.stringify(classificationCode)}`);
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid tax invoice sequence: ${sequence}`);
  }
  const number = `${serialDatePrefix(issuedAt)}_${classificationCode}_${String(sequence).padStart(SEQUENCE_WIDTH, '0')}`;
  if (number.length > MAX_LENGTH) {
    throw new Error(`Tax invoice number exceeds ${MAX_LENGTH} characters: ${number}`);
  }
  return number;
}

export interface RawSqlClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

/**
 * Assigns the next tax invoice number for a tenant and classification code.
 *
 * Must be called with the transaction client of the transaction that creates the
 * invoice. The counter row stays locked until that transaction ends, so concurrent
 * invoices are numbered one after another, and if the invoice is rolled back the
 * increment rolls back with it. That is what keeps the sequence free of gaps.
 *
 * The counter is keyed on tenant and classification code only - never on the
 * month - because numbering "should normally continue from the last invoice
 * issued" (SEC/2026/E/03 s.4.4). YYMMM is a date stamp, not a partition.
 */
export async function issueTaxInvoiceNumber(
  tx: RawSqlClient,
  input: { tenantId: string; classificationCode: string; issuedAt: Date },
): Promise<string> {
  const { tenantId, classificationCode, issuedAt } = input;
  if (!isValidClassificationCode(classificationCode)) {
    throw new Error(`Invalid tax invoice classification code: ${JSON.stringify(classificationCode)}`);
  }
  const rows = await tx.$queryRaw<{ lastSequence: number }[]>`
    INSERT INTO "InvoiceCounter" ("tenantId", "classificationCode", "lastSequence", "updatedAt")
    VALUES (${tenantId}, ${classificationCode}, 1, NOW())
    ON CONFLICT ("tenantId", "classificationCode")
    DO UPDATE SET "lastSequence" = "InvoiceCounter"."lastSequence" + 1, "updatedAt" = NOW()
    RETURNING "lastSequence"
  `;
  return formatTaxInvoiceNumber({ issuedAt, classificationCode, sequence: Number(rows[0].lastSequence) });
}
