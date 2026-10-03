console.log('🔥🔥🔥 CHAT-AGENT CODE — FINAL VERSION v29 (typo-tolerant product search + cleaner not-found wording) 🔥🔥🔥');
// FREE AI - Using Ollama instead of OpenAI (no API costs!)
// To use OpenAI instead, change this import to './openai-client'
import { generateChatCompletion, ChatMessage, FunctionDefinition } from './ollama-client';
import { getGroqClient } from './groq-client';
import { executeSafeQuery } from './erp-tasks';
import { prisma } from '@/lib/prisma';

// Re-export ChatMessage for use in other modules
export type { ChatMessage };

// The full table dictionary generated from prisma/schema.prisma (254 tables).
// Regenerate this file whenever the schema changes - see scripts/generate-table-dictionary.ts
import tableDictionary from './table-dictionary.json';

const TABLE_DICT = tableDictionary as Record<string, { columns: { name: string; type: string }[]; hasTenantId: boolean }>;
const ALL_TABLE_NAMES = Object.keys(TABLE_DICT);

/**
 * Sending all 254 tables on every request blows past Groq's free-tier TPM limit
 * (12,000 tokens/min) before the question is even added - that's why every
 * request was failing with "Request too large". Instead, pick only the tables
 * that look relevant to THIS question, based on simple keyword overlap with
 * table/column names. Kept intentionally simple (no embeddings/vector search)
 * to stay lightweight for a 2GB server.
 */
function getRelevantSchemaSummary(userMessage: string, maxTables = 10): string {
    const words = userMessage
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2);

    // Config/Settings-type tables store configuration, not transactional data,
    // and were winning keyword matches (e.g. "spareparts" -> SparePartsConfig)
    // which confused the model into ignoring the glossary above. Exclude them
    // from the suggested list entirely - they're essentially never the right
    // answer for a business data question.
    const isNoiseTable = (name: string) => /Config$|Settings?$|Preference$/i.test(name);

    const scored = ALL_TABLE_NAMES.filter((t) => !isNoiseTable(t)).map((tableName) => {
        const def = TABLE_DICT[tableName];
        const haystack = (tableName + ' ' + def.columns.map((c) => c.name).join(' ')).toLowerCase();
        const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
        return { tableName, score, def };
    });

    let relevant = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

    // No keyword matches at all (vague question) - fall back to a small generic
    // set rather than nothing, so query_database still has something to work with.
    if (relevant.length === 0) {
        relevant = scored.slice(0, 25)
    } else {
        relevant = relevant.slice(0, maxTables);
    }

    return relevant
        .map(({ tableName, def }) => {
            const cols = def.columns.map((c) => c.name).join(',');
            const scope = def.hasTenantId ? 'tenant-scoped' : 'shared';
            return `${tableName}[${scope}]:${cols}`;
        })
        .join(' | ');
}

/**
 * Available tools/functions that the AI agent can call
 */
export const AGENT_FUNCTIONS: FunctionDefinition[] = [
    {
        name: 'get_sales_summary',
        description: 'Get sales summary for a specific time period',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['today', 'week', 'month', 'quarter', 'year'],
                    description: 'The time period for the sales summary',
                },
            },
            required: ['period'],
        },
    },
    {
        name: 'get_customer_info',
        description:
            'Get detailed information about a customer by their exact database ID (not their name). ' +
            'If you only have a NAME (e.g. "Ajith Kumara"), use search_customers instead - this function ' +
            'will not find anything if given a name.',
        parameters: {
            type: 'object',
            properties: {
                customerId: {
                    type: 'string',
                    description: 'The exact database ID of the customer - never a name.',
                },
            },
            required: ['customerId'],
        },
    },
    {
        name: 'search_customers',
        description: 'Search for a SPECIFIC customer by name or email. Do NOT use this to list ALL customers - use list_all_customers for that instead.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (name or email)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'list_all_customers',
        description: 'List ALL customers across every module (CRM, spareparts, vehicle export), up to 50. Use this for "show me all customers" style questions - do NOT try to fake this with search_customers using a wildcard letter.',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'get_product_price',
        description: 'Look up the price and stock of a specific product by name (covers spareparts, menu items, and everything else - they all share one product catalog). Use this for ANY "price of X" or "how much is X" question instead of writing raw SQL for it.',
        parameters: {
            type: 'object',
            properties: {
                productName: {
                    type: 'string',
                    description: 'The product name to search for (partial match, case-insensitive)',
                },
                categoryHint: {
                    type: 'string',
                    description: 'Optional: if the question clearly mentions a module/type (e.g. "spare part", "menu item", "cake"), pass a short keyword here to help narrow results if there are multiple matches. Leave blank if unsure - it will fall back to a full search automatically.',
                },
            },
            required: ['productName'],
        },
    },
    {
        name: 'get_recent_invoices',
        description: 'Get list of recent invoices',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of invoices to retrieve (default: 10)',
                },
                status: {
                    type: 'string',
                    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
                    description: 'Filter by invoice status',
                },
            },
        },
    },
    {
        name: 'get_inventory_status',
        description: 'Get current inventory status and low stock alerts',
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Filter by product category (optional)',
                },
            },
        },
    },
    {
        name: 'get_accounting_summary',
        description: 'Get a high-level summary of accounting health (receivables, payables, recent payments)',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_project_status',
        description: 'Get status summary of active projects and task progress',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'create_task',
        description: 'Create a new task in the project management system',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Task description' },
                projectId: { type: 'string', description: 'Project ID to assign the task' },
                priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Priority' },
            },
            required: ['title', 'projectId'],
        },
    },
    {
        name: 'get_automation_status',
        description: 'Get counts and status of active business automations/workflows',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'get_ai_module_overview',
        description: 'Get high-level health of the AI module (approvals, failed runs, readiness)',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'get_pending_tasks',
        description: 'Get list of pending tasks and approvals assigned to you',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'query_database',
        description:
            'Use this for ANY question about business data that is not already covered by the other functions above ' +
            '(e.g. patients, admissions, prescriptions, HR records, hotel bookings, vehicle exports, or any of the other ' +
            'ERP modules). Generates a single read-only SELECT query against the ERP database. Always filter by tenant_id ' +
            'exactly as instructed in the system prompt for this tool. Never write INSERT, UPDATE, DELETE, or DDL statements.',
        parameters: {
            type: 'object',
            properties: {
                sql: {
                    type: 'string',
                    description:
                        'A single PostgreSQL SELECT statement. Must reference tenant_id = $TENANT_ID in the WHERE clause ' +
                        'for any table that has a tenantId column. Include a LIMIT clause. ' +
                        'IMPORTANT: For ANY question about customers (listing, searching, or looking up a specific ' +
                        'customer by name/email), use the search_customers function instead - it already checks all ' +
                        '3 customer tables (CRM, spareparts, vehicle export). Only use query_database for customers ' +
                        'if search_customers genuinely does not cover what is being asked.',
                },
            },
            required: ['sql'],
        },
    },
];

/**
 * Execute a function called by the AI agent
 */
export async function executeAgentFunction(
    functionName: string,
    args: Record<string, any>,
    tenantId: string,
    userId?: string
): Promise<any> {
    console.log(`Executing function: ${functionName}`, args);

    try {
        switch (functionName) {
            case 'get_sales_summary':
                return await getSalesSummary(args.period, tenantId);

            case 'get_customer_info':
                return await getCustomerInfo(args.customerId, tenantId);

            case 'search_customers':
                return await searchCustomers(args.query, tenantId);

            case 'list_all_customers':
                return await listAllCustomers(tenantId);

            case 'get_product_price':
                return await getProductPrice(args.productName, tenantId, args.categoryHint);

            case 'get_recent_invoices':
                return await getRecentInvoices(args.limit || 10, args.status, tenantId);

            case 'get_inventory_status':
                return await getInventoryStatus(args.category, tenantId);

            case 'get_accounting_summary':
                return await getAccountingSummary(tenantId);

            case 'get_project_status':
                return await getProjectStatus(tenantId);

            case 'create_task':
                return await createTask(args, tenantId);

            case 'get_automation_status':
                return await getAutomationStatus(tenantId);

            case 'get_ai_module_overview':
                return await getAIModuleOverview(tenantId);

            case 'get_pending_tasks':
                return await getPendingTasks(tenantId, userId);

            case 'query_database':
                // This is the text-to-SQL path. It always goes through the safe
                // execution layer, which enforces read-only, table whitelisting,
                // and tenant scoping before anything touches Postgres.
                return await executeSafeQuery(args.sql, tenantId);

            default:
                return { error: `Unknown function: ${functionName}` };
        }
    } catch (error: any) {
        console.error(`Error executing ${functionName}:`, error);
        return { error: error.message };
    }
}

// Function implementations

async function getSalesSummary(period: string, tenantId: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
        case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        default:
            startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const orders = await prisma.salesOrderV2.findMany({
        where: {
            tenantId,
            createdAt: {
                gte: startDate,
            },
        },
    });

    const totalRevenue = orders.reduce((sum: number, order) => sum + (order.grandTotal || 0), 0);
    const totalOrders = orders.length;

    return {
        period,
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
}

async function getCustomerInfo(customerId: string, tenantId: string) {
    const customer = await prisma.customer.findFirst({
        where: {
            id: customerId,
            tenantId,
        },
    });

    if (!customer) {
        return { error: 'Customer not found' };
    }

    return customer;
}

async function getProductPrice(productName: string, tenantId: string, categoryHint?: string) {
    // Products (spareparts, menu items, everything) all live in the shared
    // "Product" table - not separate tables per module. `category` is a free-form
    // field, so we don't assume exact values - we try a soft filter by the hint
    // first, and safely fall back to a full search if that finds nothing.
    const baseWhere = {
        tenantId,
        name: { contains: productName, mode: 'insensitive' as const },
    };
    const selectFields = { name: true, salePrice: true, stockQty: true, sku: true, category: true, isActive: true };

    if (categoryHint) {
        const hinted = await prisma.product.findMany({
            where: { ...baseWhere, category: { contains: categoryHint, mode: 'insensitive' } },
            select: selectFields,
            take: 10,
        });
        if (hinted.length > 0) return hinted;
    }

    const exact = await prisma.product.findMany({ where: baseWhere, select: selectFields, take: 10 });
    if (exact.length > 0) return exact;

    // No exact/substring match - try typo-tolerant fuzzy matching, same approach
    // as customer search (catches "break pad" vs "brake pad", one letter off).
    if (productName.trim().length > 2) {
        try {
            const fuzzy: any[] = await prisma.$queryRawUnsafe(
                `SELECT name, "salePrice", "stockQty", sku, category, "isActive",
                        GREATEST(similarity(name, $1),
                          1.0 - (levenshtein(lower(name), lower($1))::float / GREATEST(length(name), length($1)))
                        ) AS match_score
                 FROM "Product"
                 WHERE "tenantId" = $2
                   AND (similarity(name, $1) > 0.15 OR levenshtein(lower(name), lower($1)) <= 2)
                 ORDER BY match_score DESC LIMIT 5`,
                productName,
                tenantId
            );
            return fuzzy;
        } catch (e) {
            console.log('[fuzzy product search] extensions not available, skipping:', (e as any).message?.slice(0, 150));
        }
    }

    return [];
}

async function listAllCustomers(tenantId: string) {
    // Real "list everyone" across all 3 customer tables - no query/filter needed,
    // unlike searchCustomers which requires a search term.
    const [crm, shop, exportCustomers] = await Promise.all([
        prisma.customer.findMany({ where: { tenantId }, take: 50 }),
        prisma.shopCustomer.findMany({ where: { tenantId }, take: 50 }),
        prisma.exportCustomer.findMany({ where: { tenantId }, take: 50 }),
    ]);

    return [
        ...crm.map((c) => ({ ...c, sourceModule: 'CRM' })),
        ...shop.map((c) => ({ ...c, sourceModule: 'Spareparts' })),
        ...exportCustomers.map((c) => ({ ...c, sourceModule: 'Vehicle Export' })),
    ];
}

async function searchCustomers(query: string, tenantId: string) {
    // Split into individual words so "Amhar Hassan" also matches on just
    // "Amhar" or just "Hassan" - catches reordering, middle names, or a typo
    // in one word while the other word is spelled correctly.
    const words = query.split(/\s+/).filter((w) => w.length > 1);
    const nameConditions = (field: string) =>
        words.map((w) => ({ [field]: { contains: w, mode: 'insensitive' as const } }));

    // Your data has 3 separate "customer" tables depending on which module they
    // belong to: general CRM (Customer), spareparts shop (ShopCustomer), and
    // vehicle export (ExportCustomer). A user asking "find customer X" has no
    // way of knowing which one - so search all three and combine the results,
    // tagging each with its source module.
    const [crm, shop, exportCustomers] = await Promise.all([
        prisma.customer.findMany({
            where: {
                tenantId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    ...nameConditions('name'),
                ],
            },
            take: 10,
        }),
        prisma.shopCustomer.findMany({
            where: {
                tenantId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                    ...nameConditions('name'),
                ],
            },
            take: 10,
        }),
        prisma.exportCustomer.findMany({
            where: {
                tenantId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    ...nameConditions('name'),
                ],
            },
            take: 10,
        }),
    ]);

    // If nothing matched even with word-splitting, try real typo-tolerant matching
    // across ALL 3 tables - combining two methods:
    //   - similarity() (pg_trgm): good for longer text like full names
    //   - levenshtein() (fuzzystrmatch): counts actual letter differences, far more
    //     reliable for short single words like "Amhar" vs "Amher" (1 letter off)
    //     where trigram similarity alone is too weak to trust.
    const totalFound = crm.length + shop.length + exportCustomers.length;
    if (totalFound === 0 && query.trim().length > 2) {
        const fuzzyQuery = (table: string) => `
            SELECT *, GREATEST(similarity(name, $1),
                     1.0 - (levenshtein(lower(name), lower($1))::float / GREATEST(length(name), length($1)))
                   ) AS match_score
            FROM "${table}"
            WHERE "tenantId" = $2
              AND (similarity(name, $1) > 0.15 OR levenshtein(lower(name), lower($1)) <= 2)
            ORDER BY match_score DESC LIMIT 5`;

        try {
            const [fuzzyShop, fuzzyCrm, fuzzyExport] = await Promise.all([
                prisma.$queryRawUnsafe(fuzzyQuery('ShopCustomer'), query, tenantId) as Promise<any[]>,
                prisma.$queryRawUnsafe(fuzzyQuery('Customer'), query, tenantId) as Promise<any[]>,
                prisma.$queryRawUnsafe(fuzzyQuery('ExportCustomer'), query, tenantId) as Promise<any[]>,
            ]);

            const combined = [
                ...fuzzyShop.map((c) => ({ ...c, sourceModule: 'Spareparts (closest match)' })),
                ...fuzzyCrm.map((c) => ({ ...c, sourceModule: 'CRM (closest match)' })),
                ...fuzzyExport.map((c) => ({ ...c, sourceModule: 'Vehicle Export (closest match)' })),
            ];
            if (combined.length > 0) return combined;
        } catch (e) {
            // pg_trgm / fuzzystrmatch extensions may not be enabled - fail silently
            // and just report no results rather than crashing the whole answer.
            console.log('[fuzzy search] extensions not available, skipping:', (e as any).message?.slice(0, 150));
        }
    }

    return [
        ...crm.map((c) => ({ ...c, sourceModule: 'CRM' })),
        ...shop.map((c) => ({ ...c, sourceModule: 'Spareparts' })),
        ...exportCustomers.map((c) => ({ ...c, sourceModule: 'Vehicle Export' })),
    ];
}

async function getRecentInvoices(limit: number, status: string | undefined, tenantId: string) {
    const invoices = await prisma.invoice.findMany({
        where: {
            tenantId,
            ...(status && { status: status as any }),
        },
        take: limit,
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            customer: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    return invoices;
}

async function getInventoryStatus(category: string | undefined, tenantId: string) {
    const products = await prisma.product.findMany({
        where: {
            tenantId,
            isActive: true,
            ...(category && { category }),
        },
        select: {
            id: true,
            name: true,
            sku: true,
            stockQty: true,
            minStockQty: true,
        },
    });

    const lowStockProducts = products.filter(p => p.stockQty <= p.minStockQty);

    return {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.map(p => ({
            name: p.name,
            sku: p.sku,
            currentStock: p.stockQty,
            minRequired: p.minStockQty
        })).slice(0, 10),
        message: lowStockProducts.length > 0 
            ? `Found ${lowStockProducts.length} items at or below minimum stock levels.`
            : 'All inventory levels are currently healthy.'
    };
}

async function getAccountingSummary(tenantId: string) {
    const [invoices, payments] = await Promise.all([
        prisma.invoice.findMany({
            where: { tenantId, status: { in: ['OPEN', 'OVERDUE', 'PAID'] } },
            select: { total: true, amountDue: true, status: true }
        }),
        prisma.payment.findMany({
            where: { tenantId },
            take: 5,
            orderBy: { paymentDate: 'desc' }
        })
    ]);

    const totalReceivables = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
    const totalRevenue = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.total, 0);

    return {
        totalReceivables,
        totalRevenue,
        recentPaymentsCount: payments.length,
        topPayments: payments.map(p => ({ amount: p.amount, date: p.paymentDate })),
        healthScore: totalReceivables > totalRevenue * 0.5 ? 'CAUTION' : 'HEALTHY'
    };
}

async function getProjectStatus(tenantId: string) {
    const [projects, tasks] = await Promise.all([
        prisma.project.findMany({
            where: { tenantId, status: { not: 'COMPLETED' } },
            select: { id: true, name: true, status: true }
        }),
        prisma.task.findMany({
            where: { tenantId },
            select: { status: true }
        })
    ]);

    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    return {
        activeProjectsCount: projects.length,
        activeProjects: projects.map(p => ({ name: p.name, status: p.status })),
        overallTaskCompletion: `${completionRate.toFixed(1)}%`,
        totalTasks: tasks.length
    };
}

async function createTask(args: any, tenantId: string) {
    const task = await prisma.task.create({
        data: {
            title: args.title,
            description: args.description,
            projectId: args.projectId,
            priority: args.priority || 'MEDIUM',
            status: 'TODO',
            tenantId,
        },
    });

    return {
        success: true,
        task,
    };
}

// AI Module & Task Tools

async function getAutomationStatus(tenantId: string) {
    const db = prisma as any;
    const workflows = await db.studioWorkflow.findMany({
        where: { tenantId },
        select: { name: true, isActive: true, triggerType: true }
    });

    const active = workflows.filter((w: any) => w.isActive).length;
    const paused = workflows.length - active;

    return {
        total: workflows.length,
        active,
        paused,
        message: `There are currently ${active} live automations and ${paused} paused workflows.`,
        workflows: workflows.map((w: any) => ({ name: w.name, status: w.isActive ? 'Live' : 'Paused' }))
    };
}

async function getAIModuleOverview(tenantId: string) {
    const db = prisma as any;
    
    // Approvals are in Tenant settings JSON
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true }
    });
    
    const aiConfig = ((tenant?.settings as any)?.aiControlPlane) || {};
    const pendingApprovals = (aiConfig.pendingApprovals || []).length;

    const [workflows, executions, agents] = await Promise.all([
        db.studioWorkflow.count({ where: { tenantId, isActive: true } }),
        db.workflowExecution.count({ where: { workflow: { tenantId }, status: 'failed' } }),
        db.languageModel.count({ where: { tenantId, isActive: true } })
    ]);

    return {
        liveAutomations: workflows,
        pendingApprovals,
        failedRuns: executions,
        activeAgents: agents,
        summary: `The AI module has ${workflows} live automations, ${pendingApprovals} pending approvals, and ${executions} recorded failures that might need attention.`
    };
}

async function getPendingTasks(tenantId: string, userId?: string) {
    if (!userId) return { error: 'User context missing' };
    const db = prisma as any;

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true }
    });
    
    const aiConfig = ((tenant?.settings as any)?.aiControlPlane) || {};
    const allApprovals = (aiConfig.pendingApprovals || []) as any[];
    const myApprovals = allApprovals.filter(a => 
        a.status === 'PENDING' && (a.assignedToUserId === userId || !a.assignedToUserId)
    );

    const tasks = await prisma.task.findMany({
        where: { tenantId, status: { not: 'DONE' }, assigneeId: userId },
        take: 5
    });

    return {
        approvals: myApprovals.map(a => ({ title: a.title, risk: a.riskScore })),
        assignedTasks: tasks.map(t => ({ title: t.title, priority: t.priority })),
        count: myApprovals.length + tasks.length,
        message: `You have ${myApprovals.length} pending approvals and ${tasks.length} active tasks assigned to you.`
    };
}

/**
 * Process a user message and generate AI response with function calling
 */
export async function processUserMessage(
    message: string,
    conversationHistory: ChatMessage[],
    tenantId: string,
    userId?: string,
    maxIterations: number = 5,
    requestedModelId?: string
): Promise<{ response: string; functionCalls?: any[] }> {
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `You are an intelligent AI assistant for a comprehensive ERP system. You help users with:
- Sales and customer management
- Inventory tracking
- Financial analysis
- HR and employee management
- Project management
- And all other ERP modules (including healthcare, hotel, vehicle export, etc.)

Be helpful, concise, and professional. When asked to perform actions or retrieve data, ALWAYS use the available
functions - never invent, guess, or make up data. If a question isn't covered by one of the specific functions
(get_customer_info, get_sales_summary, etc.), use the "query_database" function to write a SQL SELECT.

When using query_database:
- CONCEPT GLOSSARY - use these EXACT tables for these common questions, don't guess:
  * Spareparts customers -> ShopCustomer (has name, phone, email)
  * Spareparts sales/invoices/purchases -> ShopInvoice (has customerId linking to ShopCustomer, total, status, createdAt)
  * General CRM customers -> Customer
  * Vehicle export customers -> ExportCustomer
  * Patients -> Patient
  * Patient admissions -> Admission
  * Doctors/medical staff -> there is NO separate Doctor table - they are User records (check role or doctorId relation)
  * Hotel bookings -> HotelBooking
  * Sales orders (general ERP) -> SalesOrderV2 (current version - not the legacy SalesOrder)
  * Point-of-sale transactions -> POSOrder
  * Purchase orders -> PurchaseOrder
  Example: "customers who bought spareparts" = SELECT DISTINCT c.name FROM "ShopCustomer" c
    JOIN "ShopInvoice" i ON i."customerId" = c.id WHERE c."tenantId" = '$TENANT_ID' LIMIT 50
- Reference only these tables and columns for anything not in the glossary above: ${getRelevantSchemaSummary(message)}
  (If the table you need isn't listed above, say you're not sure the data is available rather than guessing.)
- Every table listed with tenant scoping REQUIRED must include "tenant_id = '$TENANT_ID'" in the WHERE clause,
  written literally as the text $TENANT_ID (the system will substitute the real tenant automatically).
- Tables marked as shared/reference data do not need tenant scoping.
- There is no separate "Doctor" or "Staff" table - doctors and staff are stored as User records
  (look for a role or doctorId-style relation field instead of a dedicated table).
- Table and column names are case-sensitive, but don't worry about getting the exact case right -
  the system will auto-correct common mismatches (e.g. "admissions" -> "Admission", "tenant_id" -> "tenantId").
- For matching TEXT VALUES (not table/column names) - e.g. searching a name, condition, status, category, or
  PRODUCT NAME - ALWAYS use case-insensitive matching, no exceptions. Never use exact = matching on text values.
  Use ILIKE for plain text columns, e.g.: name ILIKE '%red velvet cake%' NOT name = 'red velvet cake' and NOT
  name = 'RED VELVET CAKE'. This applies even if you think you know the exact stored casing - always use ILIKE.
  For JSON/array columns, cast to text first: chronicConditions::text ILIKE '%cardiac%' instead of exact containment.
  Users will never type the exact casing stored in the database.
- Always include a LIMIT (50 or fewer).
- Never write INSERT, UPDATE, DELETE, DROP, ALTER, GRANT, or REVOKE.

If a function/query returns no rows or an error, say so plainly. Do not fabricate a plausible-sounding answer.
If the user asks MULTIPLE things in one message (e.g. "price of X and details of customer Y"), you must
answer ALL parts, not just the first one. Call as many functions as needed, one after another, to cover
every part of the question before giving your final answer.
NEVER show SQL, code, or query syntax in your final answer to the user, under any circumstance - not even when
explaining that no data was found, and not as a "here's what I would run" suggestion. Never use technical
phrases like "query execution failed", "the query didn't return rows", or similar in your answer - just say
plainly "I couldn't find any [X] in the system." Speak only in plain, natural sentences.
Do NOT use markdown formatting (no **bold**, no bullet points with *, no # headers) - the chat interface
displays plain text only, so markdown symbols would show up as literal asterisks/hashes. Write in plain
sentences, and if listing multiple items, use simple numbered lines (1. 2. 3.) or commas instead.
All monetary values in this system are in Sri Lankan Rupees (LKR), never USD. Always format money as
"Rs. 16,500.00" (LKR), never with a $ sign. Provide actionable insights when presenting data.`,
        },
        ...conversationHistory,
        {
            role: 'user',
            content: message,
        },
    ];

    let iterations = 0;
    let functionCalls: any[] = [];

    while (iterations < maxIterations) {
        iterations++;

        // Check for tenant-configured default model (Google, Groq, etc.)
        let assistantMessage: any = null;
        let finishReason = 'stop';

        const configuredModel = requestedModelId
            ? await prisma.languageModel.findFirst({
                where: { tenantId, id: requestedModelId, isActive: true },
                select: { provider: true, modelId: true, apiKey: true },
            })
            : await prisma.languageModel.findFirst({
                where: { tenantId, isActive: true },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
                select: { provider: true, modelId: true, apiKey: true },
            });

        const provider = configuredModel?.provider || null;

        // ── Google Gemini path ──
        if (provider === 'GOOGLE' && configuredModel?.apiKey) {
            try {
                const { generateGeminiCompletion } = require('./google-engine');
                const cleanMessages = messages.map(m => ({
                    role: m.role.toLowerCase() as any,
                    content: m.content || '',
                    name: (m as any).name,
                    function_call: (m as any).function_call
                }));

                const result = await generateGeminiCompletion(cleanMessages, {
                    apiKey: configuredModel.apiKey,
                    model: configuredModel.modelId || undefined,
                    temperature: 0.7,
                    maxTokens: 2000,
                    tools: AGENT_FUNCTIONS
                });

                if (result.function_call) {
                    finishReason = 'function_call';
                    assistantMessage = {
                        role: 'assistant',
                        content: '',
                        function_call: result.function_call
                    };
                } else {
                    assistantMessage = {
                        role: 'assistant',
                        content: result.response,
                        function_call: null
                    };
                }
            } catch (error: any) {
                console.error('Gemini failed in chat-agent, returning explicit error:', error);
                assistantMessage = {
                    role: 'assistant',
                    content: `⚠️ Gemini API Error: ${error.message || error.toString()}`,
                    function_call: null
                };
            }
        }

        // ── Groq path ──
        // Uses the direct Groq client (not the groq-engine wrapper) so we can pass
        // real `tools`, and get back a real structured tool_calls array instead of
        // the model just typing out fake "generate_sql_query(...)" text.
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!assistantMessage && groqApiKey) {
            try {
                const groqClient = getGroqClient();

                // Strict sanitization: ensure lowercase roles and valid content,
                // but KEEP `name` and `function_call` - Groq requires `name` on
                // role:'function' messages, and stripping it breaks the second
                // pass of the loop (after a function result comes back).
                const cleanMessages = messages.map(m => {
                    const cleaned: any = {
                        role: m.role.toLowerCase(),
                        content: m.content || '',
                    };
                    if ((m as any).name) cleaned.name = (m as any).name;
                    if ((m as any).function_call) cleaned.function_call = (m as any).function_call;
                    return cleaned;
                });

                // Convert AGENT_FUNCTIONS (our internal shape) into the OpenAI-style
                // `tools` shape that Groq's API actually reads.
                const tools = AGENT_FUNCTIONS.map(fn => ({
                    type: 'function' as const,
                    function: {
                        name: fn.name,
                        description: fn.description,
                        parameters: fn.parameters,
                    },
                }));

                // If a function result is already in this conversation, we already have
                // real data - the model's only job now is to phrase it into an answer.
                // Letting it attempt ANOTHER tool call here is what was causing
                // "Failed to call a function" - so force plain text on this pass.
                const alreadyHasFunctionResult = messages.some(m => m.role === 'function');

                // Retry once on rate-limit or transient tool-call parsing errors,
                // since Groq's free tier (12,000 TPM) gets hit during rapid testing -
                // this isn't a bug, just throttling, and a short wait clears it.
                let result;
                try {
                    result = await groqClient.generateCompletion(cleanMessages, {
                        temperature: 0.7,
                        maxTokens: 2000,
                        ...(alreadyHasFunctionResult
                            ? {}
                            : { tools, toolChoice: 'auto' }),
                    });
                } catch (firstError: any) {
                    const msg = firstError.message || '';
                    const isRetryable = msg.includes('rate_limit') || msg.includes('Rate limit') || msg.includes('tool_use_failed');
                    if (isRetryable) {
                        console.log('[GROQ RETRY] Transient error, waiting 2.5s then retrying once:', msg.slice(0, 150));
                        await new Promise((r) => setTimeout(r, 2500));
                        result = await groqClient.generateCompletion(cleanMessages, {
                            temperature: 0.7,
                            maxTokens: 2000,
                            ...(alreadyHasFunctionResult
                                ? {}
                                : { tools, toolChoice: 'auto' }),
                        });
                    } else {
                        throw firstError;
                    }
                }

                console.log('[GROQ RAW RESULT]', JSON.stringify({
                    hasToolCalls: !!(result.toolCalls && result.toolCalls.length > 0),
                    toolCalls: result.toolCalls,
                    responseText: result.response?.slice(0, 300),
                }));

                if (result.toolCalls && result.toolCalls.length > 0) {
                    // Model made real, structured tool call(s) - keep ALL of them,
                    // not just the first. Groq/Gemini often correctly try several
                    // tables at once (e.g. checking Customer, ShopCustomer, and
                    // ExportCustomer together) - discarding the rest was silently
                    // losing 2 out of 3 correct queries every time this happened.
                    finishReason = 'function_call';
                    assistantMessage = {
                        role: 'assistant',
                        content: '',
                        function_call: {
                            name: result.toolCalls[0].function.name,
                            arguments: result.toolCalls[0].function.arguments,
                        },
                        tool_calls: result.toolCalls,
                    };
                } else {
                    assistantMessage = {
                        role: 'assistant',
                        content: result.response,
                        function_call: null,
                    };
                }
            } catch (error: any) {
                console.error('Groq failed in chat-agent (after retry):', error);

                // Automatic fallback to Gemini - completely invisible to the user.
                // This gives you a second free daily allowance separate from Groq's,
                // and the user never sees a model name or has to pick anything.
                try {
                    const geminiModel = await prisma.languageModel.findFirst({
                        where: { tenantId, provider: 'GOOGLE', isActive: true },
                        select: { modelId: true, apiKey: true },
                    });

                    if (geminiModel?.apiKey) {
                        console.log('[FALLBACK] Groq unavailable, trying Gemini automatically...');
                        const { generateGeminiCompletion } = require('./google-engine');
                        const cleanMessagesForGemini = messages.map(m => ({
                            role: m.role.toLowerCase() as any,
                            content: m.content || '',
                            name: (m as any).name,
                            function_call: (m as any).function_call,
                        }));

                        const geminiResult = await generateGeminiCompletion(cleanMessagesForGemini, {
                            apiKey: geminiModel.apiKey,
                            model: geminiModel.modelId || undefined,
                            temperature: 0.7,
                            maxTokens: 2000,
                            tools: AGENT_FUNCTIONS,
                        });

                        if (geminiResult.function_call) {
                            finishReason = 'function_call';
                            assistantMessage = {
                                role: 'assistant',
                                content: '',
                                function_call: geminiResult.function_call,
                            };
                        } else {
                            assistantMessage = {
                                role: 'assistant',
                                content: geminiResult.response,
                                function_call: null,
                            };
                        }
                        console.log('[FALLBACK] Gemini succeeded.');
                    }
                } catch (geminiError: any) {
                    console.error('[FALLBACK] Gemini also failed:', geminiError.message);
                }

                // Final fallback: try Ollama (your local PC only - this will simply
                // be unreachable on the live server, which is expected and fine).
                if (!assistantMessage) {
                    try {
                        const { checkOllamaAvailability, generateChatCompletion } = require('./ollama-client');
                        const ollamaUp = await checkOllamaAvailability();
                        if (ollamaUp) {
                            console.log('[FALLBACK] Groq + Gemini unavailable, trying local Ollama...');
                            const cleanMessagesForOllama = messages.map(m => ({
                                role: m.role.toLowerCase() as any,
                                content: m.content || '',
                                name: (m as any).name,
                            }));
                            const ollamaResult = await generateChatCompletion(cleanMessagesForOllama, {
                                temperature: 0.7,
                                maxTokens: 2000,
                                functions: AGENT_FUNCTIONS,
                                functionCall: 'auto',
                            });
                            const choice = ollamaResult.choices[0]?.message;
                            if (choice?.function_call) {
                                finishReason = 'function_call';
                                assistantMessage = {
                                    role: 'assistant',
                                    content: '',
                                    function_call: choice.function_call,
                                };
                            } else {
                                assistantMessage = {
                                    role: 'assistant',
                                    content: choice?.content || '',
                                    function_call: null,
                                };
                            }
                            console.log('[FALLBACK] Ollama succeeded.');
                        }
                    } catch (ollamaError: any) {
                        console.error('[FALLBACK] Ollama also unavailable:', ollamaError.message);
                    }
                }

                // Only if Groq, Gemini, AND Ollama all failed/unavailable do we show this.
                if (!assistantMessage) {
                    assistantMessage = {
                        role: 'assistant',
                        content: "I'm having trouble reaching the AI service right now (it may be temporarily busy). Please try again in a few seconds.",
                        function_call: null,
                    };
                }
            }
        }

        // ── Ollama fallback (only used if GROQ_API_KEY isn't configured at all) ──
        if (!assistantMessage) {
            try {
                const completion = await generateChatCompletion(messages, {
                    functions: AGENT_FUNCTIONS,
                    functionCall: 'auto',
                });
                const choice = completion.choices[0];
                finishReason = choice.finish_reason;
                assistantMessage = choice.message;
            } catch (ollamaError: any) {
                console.error('Ollama fallback failed:', ollamaError);
                assistantMessage = {
                    role: 'assistant',
                    content: `⚠️ Ollama is not running. To use the Local Ollama model, please start Ollama on your machine (http://localhost:11434).\n\nAlternatively, switch to a cloud model (Gemini or Groq) using the model selector in the chat header.`,
                    function_call: null,
                };
            }
        }

        if (finishReason === 'function_call' && assistantMessage.function_call) {
            const allCalls: any[] = (assistantMessage as any).tool_calls?.length
                ? (assistantMessage as any).tool_calls
                : [{ id: 'single', function: assistantMessage.function_call }];

            // Add the assistant's function call(s) to messages
            messages.push({
                role: 'assistant',
                content: '',
                function_call: assistantMessage.function_call,
            } as any);

            // Execute EVERY tool call the model made, not just the first - the
            // model often correctly tries several tables/functions in parallel.
            for (const call of allCalls) {
                const functionName = call.function.name;
                let functionArgs = JSON.parse(call.function.arguments || '{}');
                if (functionArgs === null || typeof functionArgs !== 'object') {
                    functionArgs = {};
                }

                const functionResult = await executeAgentFunction(functionName, functionArgs, tenantId, userId);

                functionCalls.push({
                    name: functionName,
                    arguments: functionArgs,
                    result: functionResult,
                });

                // Add each function's result to messages so the model sees ALL of them
                messages.push({
                    role: 'function',
                    name: functionName,
                    content: JSON.stringify(functionResult, (_key, value) =>
                        typeof value === 'bigint' ? Number(value) : value
                    ),
                });
            }
        } else {
            // AI has finished responding
            return {
                response: assistantMessage.content || 'I apologize, I could not generate a response.',
                functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
            };
        }
    }

    // Never show raw JSON/data structures to the user, even as a "helpful"
    // fallback - that's just as bad as showing SQL. Always give a clean sentence.
    if (functionCalls.length > 0) {
        const lastResult: any = functionCalls[functionCalls.length - 1].result;
        const hasRows = Array.isArray(lastResult?.rows) ? lastResult.rows.length > 0 : Array.isArray(lastResult) ? lastResult.length > 0 : false;
        if (!hasRows) {
            return {
                response: "I couldn't find any matching data for that. Could you try rephrasing your question?",
                functionCalls,
            };
        }
        return {
            response: "I found some data but had trouble summarizing it clearly. Could you try asking again, maybe more specifically?",
            functionCalls,
        };
    }
    return {
        response: "I wasn't able to find an answer to that. Could you try rephrasing your question?",
        functionCalls: undefined,
    };
}
