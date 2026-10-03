/**
 * Module Account Seed Service
 *
 * Creates module-specific Chart of Accounts entries and default
 * account mappings when a module is enabled for a tenant.
 *
 * Each module defines a set of accounts that are needed for its
 * financial transactions, plus the event→account mappings.
 */

import { prisma } from '@/lib/prisma';
import { DEFAULT_ACCOUNT_CODES } from './gl-bridge';
import type { AccountType } from '@prisma/client';

// ─── Module Account Templates ────────────────────────────────────

interface AccountTemplate {
    code: string;
    name: string;
    type: AccountType;
    normalBalance: 'DEBIT' | 'CREDIT';
    description: string;
    isSystemAccount: boolean;
}

const MODULE_ACCOUNTS: Record<string, AccountTemplate[]> = {
    'spareparts': [
        { code: '1200-SP', name: 'Accounts Receivable - Spareparts', type: 'ASSET', normalBalance: 'DEBIT', description: 'Receivables from spare parts sales', isSystemAccount: true },
        { code: '4000-SP', name: 'Sales Revenue - Spareparts', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from spare parts sales', isSystemAccount: true },
        { code: '4001-SP', name: 'Sales Returns - Spareparts', type: 'REVENUE', normalBalance: 'DEBIT', description: 'Returns and refunds for spare parts', isSystemAccount: true },
        { code: '5000-SP', name: 'Cost of Goods Sold - Spareparts', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Cost of spare parts sold', isSystemAccount: true },
    ],

    'vehicle-export': [
        { code: '1400', name: 'Vehicle Inventory', type: 'ASSET', normalBalance: 'DEBIT', description: 'Vehicles held for export', isSystemAccount: true },
        { code: '1200-VE', name: 'Accounts Receivable - Vehicle Export', type: 'ASSET', normalBalance: 'DEBIT', description: 'Receivables from vehicle export sales', isSystemAccount: true },
        { code: '4100', name: 'Vehicle Sales Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from vehicle export sales', isSystemAccount: true },
        { code: '5100', name: 'Auction Fees', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Fees paid at vehicle auctions', isSystemAccount: true },
        { code: '5110', name: 'Transport Costs', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Vehicle transport costs', isSystemAccount: true },
        { code: '5120', name: 'Shipping Costs', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'International shipping costs', isSystemAccount: true },
        { code: '5130', name: 'Inspection Costs', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Vehicle inspection fees', isSystemAccount: true },
        { code: '5140', name: 'Yard Preparation Costs', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Yard work and preparation costs', isSystemAccount: true },
        { code: '5150', name: 'Export Commission', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Sales commission on vehicle exports', isSystemAccount: true },
        { code: '2200', name: 'Customer Deposits', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Advance deposits from export customers', isSystemAccount: true },
    ],

    'hotel': [
        { code: '1200-HT', name: 'Accounts Receivable - Hotel', type: 'ASSET', normalBalance: 'DEBIT', description: 'Guest folio receivables', isSystemAccount: true },
        { code: '4200', name: 'Room Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from room charges', isSystemAccount: true },
        { code: '4210', name: 'Food & Beverage Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from F&B charges', isSystemAccount: true },
        { code: '4220', name: 'Minibar Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from minibar charges', isSystemAccount: true },
        { code: '4230', name: 'Service Revenue - Hotel', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from spa and other services', isSystemAccount: true },
        { code: '2200-HT', name: 'Guest Deposits', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Advance deposits from guests', isSystemAccount: true },
    ],

    'restaurant': [
        { code: '4300', name: 'Restaurant Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from restaurant sales', isSystemAccount: true },
        { code: '4301', name: 'Restaurant Returns & Refunds', type: 'REVENUE', normalBalance: 'DEBIT', description: 'Returns and refunds for restaurant', isSystemAccount: true },
        { code: '5300', name: 'Food Cost', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Cost of food ingredients', isSystemAccount: true },
    ],

    'hr': [
        { code: '6000', name: 'Salary Expense', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Employee salary expenses', isSystemAccount: true },
        { code: '2300', name: 'Salaries Payable', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Accrued salaries owed to employees', isSystemAccount: true },
        { code: '6100', name: 'General Operating Expenses', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Reimbursable employee expenses', isSystemAccount: true },
    ],

    'properties': [
        { code: '4400', name: 'Rental Income', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from property rentals', isSystemAccount: true },
        { code: '6200', name: 'Property Maintenance Expense', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Cost of property maintenance', isSystemAccount: true },
    ],

    'healthcare': [
        { code: '4500', name: 'Medical Consultation Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from consultations', isSystemAccount: true },
        { code: '4510', name: 'Laboratory Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from lab tests', isSystemAccount: true },
        { code: '4520', name: 'Inpatient Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from admissions', isSystemAccount: true },
    ],
};

// ─── Seed Functions ──────────────────────────────────────────────

/**
 * Seeds the Chart of Accounts and default account mappings for a module.
 * Safe to call multiple times — skips accounts that already exist.
 */
export async function seedModuleAccounts(
    tenantId: string,
    moduleSlug: string
): Promise<{ accountsCreated: number; mappingsCreated: number }> {
    const templates = MODULE_ACCOUNTS[moduleSlug];
    if (!templates) {
        return { accountsCreated: 0, mappingsCreated: 0 };
    }

    let accountsCreated = 0;
    let mappingsCreated = 0;

    // 1. Ensure prerequisite shared accounts exist (Cash, Bank, AR, AP, Tax)
    await ensureSharedAccounts(tenantId);

    // 2. Create module-specific accounts
    for (const tpl of templates) {
        const existing = await prisma.account.findUnique({
            where: { code_tenantId: { code: tpl.code, tenantId } }
        });

        if (!existing) {
            await prisma.account.create({
                data: {
                    code: tpl.code,
                    name: tpl.name,
                    type: tpl.type,
                    normalBalance: tpl.normalBalance,
                    description: tpl.description,
                    isSystemAccount: tpl.isSystemAccount,
                    tenantId,
                }
            });
            accountsCreated++;
        }
    }

    // 3. Create default event→account mappings
    const defaultMappings = DEFAULT_ACCOUNT_CODES[moduleSlug];
    if (defaultMappings) {
        for (const [eventType, codes] of Object.entries(defaultMappings)) {
            const debitAccount = await prisma.account.findUnique({
                where: { code_tenantId: { code: codes.debit, tenantId } }
            });
            const creditAccount = await prisma.account.findUnique({
                where: { code_tenantId: { code: codes.credit, tenantId } }
            });

            if (debitAccount && creditAccount) {
                const existingMapping = await prisma.moduleAccountMapping.findUnique({
                    where: {
                        tenantId_moduleSlug_eventType: { tenantId, moduleSlug, eventType }
                    }
                });

                if (!existingMapping) {
                    await prisma.moduleAccountMapping.create({
                        data: {
                            tenantId,
                            moduleSlug,
                            eventType,
                            debitAccountId: debitAccount.id,
                            creditAccountId: creditAccount.id,
                            description: `Default mapping for ${moduleSlug} ${eventType}`,
                        }
                    });
                    mappingsCreated++;
                }
            }
        }
    }

    return { accountsCreated, mappingsCreated };
}

/**
 * Ensures the shared prerequisite accounts exist (Cash, Bank, AR, AP, Tax Payable).
 * These are referenced by multiple modules' default mappings.
 */
async function ensureSharedAccounts(tenantId: string) {
    const sharedAccounts: AccountTemplate[] = [
        { code: '1000', name: 'Cash', type: 'ASSET', normalBalance: 'DEBIT', description: 'Cash on hand', isSystemAccount: true },
        { code: '1010', name: 'Bank Account', type: 'ASSET', normalBalance: 'DEBIT', description: 'Primary bank account', isSystemAccount: true },
        { code: '1200', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT', description: 'General accounts receivable', isSystemAccount: true },
        { code: '1300', name: 'Inventory', type: 'ASSET', normalBalance: 'DEBIT', description: 'General inventory', isSystemAccount: true },
        { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'General accounts payable', isSystemAccount: true },
        { code: '2100', name: 'Tax Payable', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Sales/Service tax payable', isSystemAccount: true },
    ];

    for (const tpl of sharedAccounts) {
        const existing = await prisma.account.findUnique({
            where: { code_tenantId: { code: tpl.code, tenantId } }
        });

        if (!existing) {
            await prisma.account.create({
                data: {
                    code: tpl.code,
                    name: tpl.name,
                    type: tpl.type,
                    normalBalance: tpl.normalBalance,
                    description: tpl.description,
                    isSystemAccount: tpl.isSystemAccount,
                    tenantId,
                }
            });
        }
    }
}

/**
 * Seeds accounts for ALL enabled modules of a tenant.
 */
export async function seedAllModuleAccounts(tenantId: string): Promise<{
    totalAccountsCreated: number;
    totalMappingsCreated: number;
    modules: string[];
}> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { enabledModules: true }
    });

    if (!tenant) throw new Error('Tenant not found');

    let totalAccountsCreated = 0;
    let totalMappingsCreated = 0;
    const processedModules: string[] = [];

    for (const moduleSlug of tenant.enabledModules) {
        if (MODULE_ACCOUNTS[moduleSlug]) {
            const result = await seedModuleAccounts(tenantId, moduleSlug);
            totalAccountsCreated += result.accountsCreated;
            totalMappingsCreated += result.mappingsCreated;
            processedModules.push(moduleSlug);
        }
    }

    return {
        totalAccountsCreated,
        totalMappingsCreated,
        modules: processedModules,
    };
}
