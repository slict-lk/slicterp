import { prisma } from '@/lib/prisma';
import { DataSourceDescriptor, DataConnectorResult, AggregateResult, TimeSeriesResult } from './types';
import { Prisma } from '@prisma/client';

export interface DataConnector {
    id: string;
    getDescriptor(): DataSourceDescriptor;
    execute(config: Record<string, any>, tenantId: string): Promise<DataConnectorResult>;
}

export class CustomModuleConnector implements DataConnector {
    id = 'custom:*';

    getDescriptor(): DataSourceDescriptor {
        return {
            id: 'custom:*',
            name: 'Custom Module Data',
            description: 'Dynamic data from any custom module',
            availableMetrics: [
                { id: 'count', name: 'Total Records', type: 'number' },
            ],
        };
    }

    async execute(config: Record<string, any>, tenantId: string): Promise<DataConnectorResult> {
        try {
            // Expect config: { moduleId: string, metric: 'count', groupBy?: string, dateRange?: string }
            if (!config.moduleId) return { data: null, error: 'moduleId is required' };

            const where: Prisma.CustomRecordWhereInput = {
                moduleId: config.moduleId,
                tenantId,
            };

            if (config.metric === 'count') {
                const count = await prisma.customRecord.count({ where });
                return { data: count };
            }

            return { data: null, error: 'Unsupported metric for custom module' };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    }
}

export class AccountingConnector implements DataConnector {
    id = 'erp:accounting';

    getDescriptor(): DataSourceDescriptor {
        return {
            id: 'erp:accounting',
            name: 'Accounting',
            description: 'Core accounting metrics (Invoices, Payments)',
            availableMetrics: [
                { id: 'total_revenue', name: 'Total Revenue', type: 'currency' },
                { id: 'unpaid_invoices', name: 'Unpaid Invoices', type: 'currency' },
                { id: 'recent_invoices', name: 'Recent Invoices', type: 'number' },
            ],
        };
    }

    async execute(config: Record<string, any>, tenantId: string): Promise<DataConnectorResult> {
        try {
            const metric = config.metric || config.metrics?.[0]; // Support both single and multiple metrics configs depending on widget

            if (metric === 'total_revenue') {
                const result = await prisma.invoice.aggregate({
                    where: { tenantId, status: 'PAID', type: 'SALES' },
                    _sum: { total: true },
                });
                return { data: result._sum?.total || 0 };
            }

            if (metric === 'unpaid_invoices') {
                const result = await prisma.invoice.aggregate({
                    where: { tenantId, status: { in: ['OPEN', 'OVERDUE'] }, type: 'SALES' },
                    _sum: { total: true },
                });
                return { data: result._sum?.total || 0 };
            }

            if (metric === 'recent_invoices') {
                const limit = config.limit || 10;
                const data = await prisma.invoice.findMany({
                    where: { tenantId, type: 'SALES' },
                    take: limit,
                    orderBy: { issueDate: 'desc' },
                    select: { number: true, total: true, status: true, issueDate: true, customer: { select: { name: true } } }
                });
                return { data };
            }

            return { data: null, error: 'Unsupported metric' };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    }
}

export class CRMConnector implements DataConnector {
    id = 'erp:crm';

    getDescriptor(): DataSourceDescriptor {
        return {
            id: 'erp:crm',
            name: 'CRM',
            description: 'Customer and Lead metrics',
            availableMetrics: [
                { id: 'total_customers', name: 'Total Customers', type: 'number' },
                { id: 'open_opportunities', name: 'Open Opportunities', type: 'currency' },
                { id: 'new_leads', name: 'New Leads', type: 'number' },
            ],
        };
    }

    async execute(config: Record<string, any>, tenantId: string): Promise<DataConnectorResult> {
        try {
            const metric = config.metric || config.metrics?.[0];

            if (metric === 'total_customers') {
                const count = await prisma.customer.count({ where: { tenantId, status: 'ACTIVE' } });
                return { data: count };
            }

            if (metric === 'open_opportunities') {
                const result = await prisma.opportunity.aggregate({
                    where: { tenantId, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
                    _sum: { amount: true },
                });
                return { data: result._sum.amount || 0 };
            }

            if (metric === 'new_leads') {
                const count = await prisma.lead.count({ where: { tenantId, status: 'NEW' } });
                return { data: count };
            }

            return { data: null, error: 'Unsupported metric' };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    }
}

// Global Registry Singleton
class DataConnectorRegistry {
    private static instance: DataConnectorRegistry;
    private connectors: Map<string, DataConnector> = new Map();

    private constructor() {
        this.register(new CustomModuleConnector());
        this.register(new AccountingConnector());
        this.register(new CRMConnector());
        // ... Additional connectors for SpareParts, VehicleExport, Hotel, HR etc would be registered here.
    }

    public static getInstance(): DataConnectorRegistry {
        if (!DataConnectorRegistry.instance) {
            DataConnectorRegistry.instance = new DataConnectorRegistry();
        }
        return DataConnectorRegistry.instance;
    }

    public register(connector: DataConnector) {
        this.connectors.set(connector.id, connector);
    }

    // Map friendly data source names used in widget dropdowns to actual connector IDs
    private static ALIASES: Record<string, string> = {
        'accounting_invoices': 'erp:accounting',
        'accounting_payments': 'erp:accounting',
        'crm_leads': 'erp:crm',
        'crm_customers': 'erp:crm',
        'sales_orders': 'erp:accounting',
        'inventory_products': 'erp:accounting',
    };

    public getConnector(id: string): DataConnector | undefined {
        // Handle dynamic custom module ids (e.g., "custom:properties")
        if (id.startsWith('custom:')) {
            return this.connectors.get('custom:*');
        }
        // Resolve aliases from widget dropdown values to registered connector IDs
        const resolvedId = DataConnectorRegistry.ALIASES[id] || id;
        return this.connectors.get(resolvedId);
    }

    public listDescriptors(): DataSourceDescriptor[] {
        return Array.from(this.connectors.values()).map(c => c.getDescriptor());
    }
}

export const registry = DataConnectorRegistry.getInstance();

export async function executeDataConnector(dataSourceId: string, config: Record<string, any>, tenantId: string) {
    const connector = registry.getConnector(dataSourceId);
    if (!connector) throw new Error(`Connector not found for ID: ${dataSourceId}`);

    // Auto-inject module ID for custom connectors
    const resolvedConfig = { ...config };
    if (dataSourceId.startsWith('custom:') && !resolvedConfig.moduleId) {
        const slug = dataSourceId.split(':')[1];
        const mod = await prisma.customModule.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
        if (!mod) throw new Error(`Custom module not found: ${slug}`);
        resolvedConfig.moduleId = mod.id;
    }

    return connector.execute(resolvedConfig, tenantId);
}

export function getDataSourceDescriptors() {
    return registry.listDescriptors();
}
