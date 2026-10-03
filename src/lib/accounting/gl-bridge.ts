/**
 * GL Bridge — Central service for posting journal entries from any module.
 *
 * Provides:
 *  - postToGL()       — Creates a balanced journal entry from any module event
 *  - reverseGLEntry() — Voids an existing entry and creates a reversal
 *  - getModuleMappings() — Retrieves account mappings for a module
 *
 * This is the SINGLE integration point between module-specific financial
 * transactions (ShopInvoice, ExportInvoice, HotelBooking, etc.) and the
 * central Accounting General Ledger.
 */

import { prisma } from '@/lib/prisma';
import type { PrismaClient, Prisma } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────

export interface GLPostingLine {
    accountCode: string;
    debit: number;
    credit: number;
    description: string;
    currencyCode?: string;
    exchangeRate?: number;
}

export interface GLPostingRequest {
    tenantId: string;
    sourceModule: string;           // "spareparts" | "vehicle-export" | "hotel" | "restaurant" | "pos" | "sales" | "purchasing" | "hr" | "properties" | "healthcare"
    sourceDocumentId: string;
    sourceDocumentType: string;     // "ShopInvoice" | "ExportInvoice" | "HotelBooking" | "POSOrder" | etc.
    eventType: string;              // "SALE" | "PAYMENT_RECEIVED" | "REFUND" | "PURCHASE_RECEIVED" | etc.
    description: string;
    date: Date;
    lines: GLPostingLine[];
    periodId?: string;              // auto-detected if not provided
    reference?: string;             // auto-generated if not provided
}

export interface GLPostingResult {
    success: boolean;
    journalEntryId?: string;
    error?: string;
}

// ─── Module Slug Constants ───────────────────────────────────────

export const MODULE_SLUGS = {
    SPAREPARTS: 'spareparts',
    VEHICLE_EXPORT: 'vehicle-export',
    HOTEL: 'hotel',
    RESTAURANT: 'restaurant',
    POS: 'pos',
    SALES: 'sales',
    PURCHASING: 'purchasing',
    HR: 'hr',
    PROPERTIES: 'properties',
    HEALTHCARE: 'healthcare',
} as const;

export type ModuleSlug = (typeof MODULE_SLUGS)[keyof typeof MODULE_SLUGS];

// ─── Reference Prefix Mapping ────────────────────────────────────

const MODULE_REF_PREFIX: Record<string, string> = {
    'spareparts': 'SP',
    'vehicle-export': 'VE',
    'hotel': 'HT',
    'restaurant': 'RS',
    'pos': 'POS',
    'sales': 'SL',
    'purchasing': 'PU',
    'hr': 'HR',
    'properties': 'PR',
    'healthcare': 'HC',
};

// ─── Core Functions ──────────────────────────────────────────────

/**
 * Posts a balanced journal entry to the General Ledger from any module.
 *
 * Features:
 *  - Auto-detects the open accounting period for the given date
 *  - Validates debits = credits before posting
 *  - Resolves accounts by code + tenantId
 *  - Prevents duplicate entries via sourceDocumentId + sourceDocumentType idempotency
 *  - Handles currency conversion to base currency
 */
export async function postToGL(request: GLPostingRequest, txClient?: any): Promise<GLPostingResult> {
    try {
        // 1. Validate debit/credit balance
        const totalDebit = request.lines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = request.lines.reduce((sum, l) => sum + l.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return {
                success: false,
                error: `Journal entry is unbalanced: Debit=${totalDebit.toFixed(2)}, Credit=${totalCredit.toFixed(2)}`
            };
        }

        if (request.lines.length === 0) {
            return { success: false, error: 'No journal lines provided' };
        }

        const work = async (tx: any) => {
            // 2. Idempotency check — prevent duplicate GL entries for the same source document + event
            //    We prefix descriptions with [EVENT_TYPE] on creation so this check is reliable.
            const eventTag = `[${request.eventType}]`;
            const existing = await tx.journalEntry.findFirst({
                where: {
                    tenantId: request.tenantId,
                    sourceDocumentId: request.sourceDocumentId,
                    sourceDocumentType: request.sourceDocumentType,
                    sourceModule: request.sourceModule,
                    // Include eventType in idempotency check so the same document
                    // can post different event types (e.g., VEHICLE_PURCHASE and AUCTION_FEE)
                    description: { startsWith: eventTag },
                    status: 'POSTED',
                }
            });

            if (existing) {
                return { journalEntryId: existing.id, alreadyExists: true };
            }

            // 3. Find the open accounting period for the given date
            let periodId = request.periodId;
            if (!periodId) {
                const period = await tx.accountingPeriod.findFirst({
                    where: {
                        tenantId: request.tenantId,
                        status: 'OPEN',
                        startDate: { lte: request.date },
                        endDate: { gte: request.date },
                    }
                });

                if (!period) {
                    throw new Error(`No open accounting period found for date ${request.date.toISOString().split('T')[0]}`);
                }
                periodId = period.id;
            }

            // 4. Resolve account codes to account IDs
            const accountCodes = [...new Set(request.lines.map(l => l.accountCode))];
            const accounts = await tx.account.findMany({
                where: {
                    tenantId: request.tenantId,
                    code: { in: accountCodes }
                }
            });

            const accountMap = new Map<string, any>(accounts.map((a: any) => [a.code, a]));

            // Validate all accounts exist
            for (const code of accountCodes) {
                if (!accountMap.has(code)) {
                    throw new Error(`Account with code "${code}" not found for tenant`);
                }
            }

            // 5. Generate reference
            const prefix = MODULE_REF_PREFIX[request.sourceModule] || 'GL';
            const reference = request.reference || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            // 6. Create the journal entry with lines
            const journalEntry = await tx.journalEntry.create({
                data: {
                    tenantId: request.tenantId,
                    periodId,
                    reference,
                    description: `[${request.eventType}] ${request.description}`,
                    entryDate: request.date,
                    status: 'POSTED',
                    sourceModule: request.sourceModule,
                    sourceDocumentId: request.sourceDocumentId,
                    sourceDocumentType: request.sourceDocumentType,
                    lines: {
                        create: request.lines.map(line => {
                            const account = accountMap.get(line.accountCode)!;
                            const exchangeRate = line.exchangeRate ?? 1;
                            const baseCurrencyAmount = line.debit > 0
                                ? line.debit * exchangeRate
                                : line.credit > 0
                                    ? line.credit * exchangeRate
                                    : 0;

                            return {
                                accountId: account.id,
                                description: line.description,
                                debit: line.debit,
                                credit: line.credit,
                                currencyCode: line.currencyCode || 'LKR',
                                exchangeRate,
                                baseCurrency: baseCurrencyAmount,
                            };
                        })
                    }
                }
            });

            return { journalEntryId: journalEntry.id, alreadyExists: false };
        };

        let result;
        if (txClient) {
            result = await work(txClient);
        } else {
            result = await prisma.$transaction(work);
        }

        return {
            success: true,
            journalEntryId: result.journalEntryId,
        };
    } catch (error: any) {
        console.error(`[GL Bridge] Error posting from ${request.sourceModule}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to post to General Ledger',
        };
    }
}

/**
 * Reverses (voids) an existing journal entry and creates a mirror reversal.
 * Used when a transaction is cancelled, voided, or a credit note is issued.
 */
export async function reverseGLEntry(
    tenantId: string,
    sourceDocumentId: string,
    sourceDocumentType: string,
    reason: string
): Promise<GLPostingResult> {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Find the original entry
            const original = await tx.journalEntry.findFirst({
                where: {
                    tenantId,
                    sourceDocumentId,
                    sourceDocumentType,
                    status: 'POSTED',
                },
                include: { lines: true }
            });

            if (!original) {
                throw new Error('Original journal entry not found');
            }

            // Void the original
            await tx.journalEntry.update({
                where: { id: original.id },
                data: {
                    status: 'VOIDED',
                    voidedAt: new Date(),
                    voidedBy: 'system',
                }
            });

            // Create reversal entry
            const reversal = await tx.journalEntry.create({
                data: {
                    tenantId,
                    periodId: original.periodId,
                    reference: `REV-${original.reference}`,
                    description: `REVERSAL: ${reason} (Original: ${original.reference})`,
                    entryDate: new Date(),
                    status: 'POSTED',
                    sourceModule: original.sourceModule,
                    sourceDocumentId: `${sourceDocumentId}-REV`,
                    sourceDocumentType: `${sourceDocumentType}-REVERSAL`,
                    lines: {
                        create: original.lines.map(line => ({
                            accountId: line.accountId,
                            description: `Reversal: ${line.description || ''}`,
                            debit: line.credit,   // Swap debit/credit for reversal
                            credit: line.debit,
                            currencyCode: line.currencyCode,
                            exchangeRate: line.exchangeRate,
                            baseCurrency: line.baseCurrency,
                        }))
                    }
                }
            });

            return reversal.id;
        });

        return { success: true, journalEntryId: result };
    } catch (error: any) {
        console.error('[GL Bridge] Error reversing entry:', error);
        return { success: false, error: error.message || 'Failed to reverse GL entry' };
    }
}

/**
 * Retrieves module account mappings for a given tenant and module.
 * Falls back to default codes if no custom mapping exists.
 */
export async function getModuleMappings(
    tenantId: string,
    moduleSlug: string,
    txClient?: any
): Promise<Map<string, { debitCode: string; creditCode: string }>> {
    const client = txClient || prisma;
    const mappings = await client.moduleAccountMapping.findMany({
        where: { tenantId, moduleSlug, isActive: true },
        include: {
            debitAccount: { select: { code: true } },
            creditAccount: { select: { code: true } },
        }
    });

    const result = new Map<string, { debitCode: string; creditCode: string }>();
    for (const m of mappings) {
        result.set(m.eventType, {
            debitCode: m.debitAccount.code,
            creditCode: m.creditAccount.code,
        });
    }

    return result;
}

// ─── Default Account Code Templates ─────────────────────────────
// Used when no custom mapping exists for a module/event combination.

export const DEFAULT_ACCOUNT_CODES: Record<string, Record<string, { debit: string; credit: string }>> = {
    'spareparts': {
        SALE: { debit: '1200', credit: '4000' },
        SALE_TAX: { debit: '1200', credit: '2100' },
        SALE_CASH: { debit: '1000', credit: '4000' },
        PAYMENT_RECEIVED: { debit: '1000', credit: '1200' },
        REFUND: { debit: '4000', credit: '1200' },
        PURCHASE_RECEIVED: { debit: '5000', credit: '2000' },
        PURCHASE_PAYMENT: { debit: '2000', credit: '1000' },
    },
    'vehicle-export': {
        VEHICLE_PURCHASE: { debit: '1400', credit: '1000' },
        AUCTION_FEE: { debit: '5100', credit: '1000' },
        TRANSPORT_COST: { debit: '5110', credit: '1000' },
        SHIPPING_COST: { debit: '5120', credit: '1000' },
        INSPECTION_COST: { debit: '5130', credit: '1000' },
        YARD_COST: { debit: '5140', credit: '1000' },
        COMMISSION: { debit: '5150', credit: '1000' },
        EXPORT_SALE: { debit: '1200', credit: '4100' },
        CUSTOMER_DEPOSIT: { debit: '1000', credit: '2200' },
        DEPOSIT_APPLIED: { debit: '2200', credit: '1200' },
    },
    'hotel': {
        ROOM_CHARGE: { debit: '1200', credit: '4200' },
        FB_CHARGE: { debit: '1200', credit: '4210' },
        MINIBAR_CHARGE: { debit: '1200', credit: '4220' },
        SERVICE_CHARGE: { debit: '1200', credit: '4230' },
        CHARGE_TAX: { debit: '1200', credit: '2100' },
        GUEST_DEPOSIT: { debit: '1000', credit: '2200' },
        GUEST_PAYMENT: { debit: '1000', credit: '1200' },
        DEPOSIT_APPLIED: { debit: '2200', credit: '1200' },
    },
    'restaurant': {
        SALE_CASH: { debit: '1000', credit: '4300' },
        SALE_CARD: { debit: '1010', credit: '4300' },
        SALE_TAX: { debit: '1000', credit: '2100' },
        REFUND: { debit: '4300', credit: '1000' },
    },
    'pos': {
        SALE_CASH: { debit: '1000', credit: '4000' },
        SALE_CARD: { debit: '1010', credit: '4000' },
        SALE_TAX: { debit: '1000', credit: '2100' },
    },
    'sales': {
        SALE: { debit: '1200', credit: '4000' },
        SALE_TAX: { debit: '1200', credit: '2100' },
        PAYMENT_RECEIVED: { debit: '1000', credit: '1200' },
    },
    'purchasing': {
        PURCHASE_RECEIVED: { debit: '1300', credit: '2000' },
        PURCHASE_PAYMENT: { debit: '2000', credit: '1000' },
    },
    'hr': {
        SALARY_ACCRUAL: { debit: '6000', credit: '2300' },
        SALARY_PAYMENT: { debit: '2300', credit: '1000' },
        EXPENSE_APPROVED: { debit: '6100', credit: '2000' },
        EXPENSE_REIMBURSED: { debit: '2000', credit: '1000' },
    },
    'properties': {
        RENT_DUE: { debit: '1200', credit: '4400' },
        RENT_RECEIVED: { debit: '1000', credit: '1200' },
        MAINTENANCE_COST: { debit: '6100', credit: '1000' },
    },
    'healthcare': {
        CONSULTATION_FEE: { debit: '1200', credit: '4500' },
        LAB_FEE: { debit: '1200', credit: '4510' },
        ADMISSION_CHARGE: { debit: '1200', credit: '4520' },
        PATIENT_PAYMENT: { debit: '1000', credit: '1200' },
    },
};

/**
 * Helper: resolve account code for a module event, checking custom mappings first.
 */
export async function resolveAccountCodes(
    tenantId: string,
    moduleSlug: string,
    eventType: string,
    txClient?: any
): Promise<{ debitCode: string; creditCode: string } | null> {
    // 1. Check custom mappings
    const mappings = await getModuleMappings(tenantId, moduleSlug, txClient);
    const custom = mappings.get(eventType);
    if (custom) return custom;

    // 2. Fall back to defaults
    const defaults = DEFAULT_ACCOUNT_CODES[moduleSlug]?.[eventType];
    if (defaults) return { debitCode: defaults.debit, creditCode: defaults.credit };

    return null;
}
