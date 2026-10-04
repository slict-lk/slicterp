import {
  formatTaxInvoiceNumber,
  isValidClassificationCode,
  issueTaxInvoiceNumber,
  normalizeTin,
  readTaxInvoiceSettings,
  serialDatePrefix,
  validatePurchaser,
  validateTaxInvoiceLines,
} from '@/lib/tax-invoice';

describe('serialDatePrefix', () => {
  // Sri Lanka is UTC+05:30. Local midnight on 1 October is 18:30 UTC on 30 September.
  it('stamps the last second of 30 September Colombo time as SEP', () => {
    expect(serialDatePrefix(new Date('2026-09-30T18:29:59Z'))).toBe('26SEP');
  });

  it('stamps local midnight on 1 October as OCT even though UTC is still 30 September', () => {
    expect(serialDatePrefix(new Date('2026-09-30T18:30:00Z'))).toBe('26OCT');
  });

  it('uses fixed three-letter English month codes for every month', () => {
    const codes = Array.from({ length: 12 }, (_, month) =>
      serialDatePrefix(new Date(Date.UTC(2026, month, 15, 6))),
    );
    expect(codes).toEqual([
      '26JAN', '26FEB', '26MAR', '26APR', '26MAY', '26JUN',
      '26JUL', '26AUG', '26SEP', '26OCT', '26NOV', '26DEC',
    ]);
  });

  it('uses the last two digits of the year, as in the circular example', () => {
    expect(serialDatePrefix(new Date('2030-03-10T06:00:00Z'))).toBe('30MAR');
  });

  it('rejects an invalid date', () => {
    expect(() => serialDatePrefix(new Date('not a date'))).toThrow(RangeError);
  });
});

describe('isValidClassificationCode', () => {
  it.each(['H', 'HQ', 'BR03', 'A1B2C3D4E5F6G7H'])('accepts %s', (code) => {
    expect(isValidClassificationCode(code)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['16 characters', 'A1B2C3D4E5F6G7H8'],
    ['a space', 'BR 03'],
    ['an underscore, which would break the delimiters', 'BR_03'],
    ['a hyphen', 'BR-03'],
  ])('rejects %s', (_label, code) => {
    expect(isValidClassificationCode(code)).toBe(false);
  });
});

describe('formatTaxInvoiceNumber', () => {
  const issuedAt = new Date('2026-10-01T04:00:00Z');

  it('produces YYMMM_QQQQ_XXXXX', () => {
    expect(formatTaxInvoiceNumber({ issuedAt, classificationCode: 'HQ', sequence: 1 })).toBe('26OCT_HQ_00001');
  });

  it('keeps the classification code exactly as configured', () => {
    expect(formatTaxInvoiceNumber({ issuedAt, classificationCode: 'Br03', sequence: 7 })).toBe('26OCT_Br03_00007');
  });

  it('grows past five digits instead of wrapping or truncating', () => {
    expect(formatTaxInvoiceNumber({ issuedAt, classificationCode: 'HQ', sequence: 123456 })).toBe('26OCT_HQ_123456');
  });

  it('stays within 40 characters with the longest classification code', () => {
    const number = formatTaxInvoiceNumber({
      issuedAt,
      classificationCode: 'A1B2C3D4E5F6G7H',
      sequence: Number.MAX_SAFE_INTEGER,
    });
    expect(number.length).toBeLessThanOrEqual(40);
    expect(number).not.toMatch(/\s/);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects sequence %p', (sequence) => {
    expect(() => formatTaxInvoiceNumber({ issuedAt, classificationCode: 'HQ', sequence })).toThrow();
  });

  it('rejects an invalid classification code', () => {
    expect(() => formatTaxInvoiceNumber({ issuedAt, classificationCode: 'BR 03', sequence: 1 })).toThrow();
  });
});

describe('issueTaxInvoiceNumber', () => {
  function fakeTransaction(lastSequence: number) {
    const calls: { strings: readonly string[]; values: unknown[] }[] = [];
    const tx = {
      async $queryRaw<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
        calls.push({ strings: [...strings], values });
        return [{ lastSequence }] as T;
      },
    };
    return { tx, calls };
  }

  const input = { tenantId: 'tenant_abc', classificationCode: 'HQ', issuedAt: new Date('2026-10-01T04:00:00Z') };

  it('formats the sequence the counter returns', async () => {
    const { tx } = fakeTransaction(42);
    await expect(issueTaxInvoiceNumber(tx, input)).resolves.toBe('26OCT_HQ_00042');
  });

  it('passes tenant and code as bound parameters, never as SQL text', async () => {
    const { tx, calls } = fakeTransaction(1);
    await issueTaxInvoiceNumber(tx, input);
    const sql = calls[0].strings.join('?');
    expect(calls[0].values).toEqual(['tenant_abc', 'HQ']);
    expect(sql).not.toContain('tenant_abc');
    expect(sql).toContain('ON CONFLICT ("tenantId", "classificationCode")');
    expect(sql).toContain('RETURNING "lastSequence"');
  });

  it('keys the counter on tenant and code only, so numbering does not restart each month', async () => {
    const { tx, calls } = fakeTransaction(1);
    await issueTaxInvoiceNumber(tx, input);
    expect(calls[0].values).not.toContain('26OCT');
  });

  it('refuses an invalid classification code before touching the database', async () => {
    const { tx, calls } = fakeTransaction(1);
    await expect(issueTaxInvoiceNumber(tx, { ...input, classificationCode: 'BR_03' })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe('normalizeTin', () => {
  it('accepts nine digits and trims surrounding space', () => {
    expect(normalizeTin('123456789')).toBe('123456789');
    expect(normalizeTin(' 123456789 ')).toBe('123456789');
  });

  it.each(['12345678', '1234567890', '12345678A', '123-456-789', '123456789-7000', '', null, undefined])(
    'rejects %p rather than guessing',
    (value) => {
      expect(normalizeTin(value as string | null | undefined)).toBeNull();
    },
  );
});

describe('readTaxInvoiceSettings', () => {
  const complete = {
    enabled: true,
    classificationCode: 'HQ',
    registeredName: 'Serendib Traders (Pvt) Ltd',
    registeredAddress: 'No. 42, Nawala Road, Rajagiriya',
  };

  it('treats a tenant with no setting as not opted in', () => {
    expect(readTaxInvoiceSettings({ settings: null, taxRegistrationNumber: null })).toEqual({
      ok: true,
      settings: { enabled: false },
    });
  });

  it('treats enabled: false, or any value other than true, as not opted in', () => {
    for (const enabled of [false, 'true', 1]) {
      const result = readTaxInvoiceSettings({ settings: { taxInvoice: { ...complete, enabled } }, taxRegistrationNumber: '123456789' });
      expect(result).toEqual({ ok: true, settings: { enabled: false } });
    }
  });

  it('returns the full settings when opted in and complete', () => {
    expect(readTaxInvoiceSettings({ settings: { taxInvoice: complete }, taxRegistrationNumber: '123456789' })).toEqual({
      ok: true,
      settings: { ...complete, supplierTin: '123456789' },
    });
  });

  it('reports every missing particular rather than falling back', () => {
    const result = readTaxInvoiceSettings({ settings: { taxInvoice: { enabled: true } }, taxRegistrationNumber: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(4);
    }
  });

  it('rejects a supplier TIN that is not nine digits', () => {
    const result = readTaxInvoiceSettings({ settings: { taxInvoice: complete }, taxRegistrationNumber: '123456789-7000' });
    expect(result.ok).toBe(false);
  });
});

describe('validateTaxInvoiceLines', () => {
  it('requires at least one line', () => {
    expect(validateTaxInvoiceLines([])).toHaveLength(1);
  });

  it('accepts a specific description and a positive quantity', () => {
    expect(validateTaxInvoiceLines([{ description: 'Corrugated cartons, 350 x 250 x 200 mm', quantity: 1200 }])).toEqual([]);
  });

  it('accepts a numeric quantity sent as a string', () => {
    expect(validateTaxInvoiceLines([{ description: 'Pallet wrapping service', quantity: '12' }])).toEqual([]);
  });

  it.each(['Item', 'items', 'SERVICES', ' Miscellaneous '])('rejects the vague description %p', (description) => {
    expect(validateTaxInvoiceLines([{ description, quantity: 1 }])).toHaveLength(1);
  });

  it('rejects a missing description and a non-positive quantity on the same line', () => {
    expect(validateTaxInvoiceLines([{ description: '  ', quantity: 0 }])).toHaveLength(2);
  });
});

describe('validatePurchaser', () => {
  it('asks nothing of a purchaser who is not VAT-registered', () => {
    expect(validatePurchaser({ name: 'Walk-in customer', address: null, taxRegistrationNumber: null })).toEqual([]);
  });

  it('accepts a VAT-registered purchaser with TIN, name and address', () => {
    expect(
      validatePurchaser({ name: 'Lanka Foods (Pvt) Ltd', address: 'No. 187, Galle Road, Colombo 03', taxRegistrationNumber: '209884517' }),
    ).toEqual([]);
  });

  it('requires a valid TIN and an address from a VAT-registered purchaser', () => {
    expect(validatePurchaser({ name: 'Lanka Foods (Pvt) Ltd', address: '', taxRegistrationNumber: '20988' })).toHaveLength(2);
  });
});
