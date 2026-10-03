import { prisma } from '@/lib/prisma';
import {
    CreateDashboardInput,
    UpdateDashboardInput,
    CreateWidgetInput,
    UpdateWidgetInput,
    PaginationParams,
    PaginatedResponse,
    StudioDashboard
} from './types';
import { Prisma } from '@prisma/client';

export interface DashboardFilters extends PaginationParams {
    search?: string;
    isPublished?: boolean;
}

// ----------------------------------------------------------------------------
// DASHBOARDS
// ----------------------------------------------------------------------------

export async function getDashboards(
    tenantId: string,
    filters?: DashboardFilters
): Promise<PaginatedResponse<StudioDashboard>> {
    const { skip = 0, take = 50, search, isPublished, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};

    const allowedSortFields = ['createdAt', 'updatedAt', 'name'];
    const safeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';

    const where: Prisma.StudioDashboardWhereInput = {
        tenantId,
        ...(isPublished !== undefined && { isPublished }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const [count, data] = await Promise.all([
        prisma.studioDashboard.count({ where }),
        prisma.studioDashboard.findMany({
            where,
            skip,
            take,
            orderBy: { [safeSortBy]: sortOrder },
            include: {
                widgets: true,
            },
        }),
    ]);

    return {
        data: data as unknown as StudioDashboard[],
        count,
        skip,
        take
    };
}

export async function getDashboardById(id: string, tenantId: string): Promise<StudioDashboard | null> {
    const dashboard = await prisma.studioDashboard.findFirst({
        where: { id, tenantId },
        include: {
            widgets: true,
        },
    });

    if (!dashboard) return null;
    return dashboard as unknown as StudioDashboard;
}

export async function createDashboard(
    tenantId: string,
    input: CreateDashboardInput,
    createdById?: string
): Promise<StudioDashboard> {
    // If setting this one to default, unset others first
    if (input.isDefault) {
        await prisma.studioDashboard.updateMany({
            where: { tenantId, isDefault: true },
            data: { isDefault: false },
        });
    }

    const dashboard = await prisma.studioDashboard.create({
        data: {
            tenantId,
            name: input.name,
            description: input.description,
            icon: input.icon || 'layout-dashboard',
            layout: input.layout as any,
            isDefault: input.isDefault ?? false,
            isPublished: input.isPublished ?? true,
            createdById,
        },
    });

    // Create widgets if provided
    if (input.widgets && input.widgets.length > 0) {
        const layout = (input.layout as any) || { cols: 12, rows: 0, items: [] };
        const idMap = new Map<string, string>(); // tempId -> realId

        for (let i = 0; i < input.widgets.length; i++) {
            const w = input.widgets[i];
            const layoutItem = layout.items?.find((item: any) => item.widgetId === w.id);
            const widget = await prisma.dashboardWidget.create({
                data: {
                    dashboardId: dashboard.id,
                    title: w.title || `Widget ${i + 1}`,
                    type: w.type || 'metric',
                    dataSource: w.dataSource || '',
                    config: { chartType: w.chartType, metrics: w.metrics } as any,
                    position: (layoutItem ? { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } : { x: 0, y: i * 2, w: 6, h: 2 }) as any,
                },
            });
            if (w.id) idMap.set(w.id, widget.id);
        }

        // Update layout items to use real widget IDs
        if (layout.items?.length) {
            const updatedItems = layout.items.map((item: any) => ({
                ...item,
                widgetId: idMap.get(item.widgetId) || item.widgetId,
            }));
            await prisma.studioDashboard.update({
                where: { id: dashboard.id },
                data: { layout: { ...layout, items: updatedItems } as any },
            });
        }
    }

    // Re-fetch with widgets included
    const result = await prisma.studioDashboard.findUnique({
        where: { id: dashboard.id },
        include: { widgets: true },
    });
    return (result || dashboard) as unknown as StudioDashboard;
}

export async function updateDashboard(
    id: string,
    tenantId: string,
    data: UpdateDashboardInput
): Promise<StudioDashboard> {
    // If setting this one to default, unset others first
    if (data.isDefault === true) {
        await prisma.studioDashboard.updateMany({
            where: { tenantId, isDefault: true, id: { not: id } },
            data: { isDefault: false },
        });
    }

    const updated = await prisma.studioDashboard.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
            icon: data.icon,
            layout: data.layout as any,
            isDefault: data.isDefault,
            isPublished: data.isPublished,
        },
    });

    // Sync widgets if provided
    if (data.widgets) {
        const existingWidgets = await prisma.dashboardWidget.findMany({ where: { dashboardId: id } });
        const existingIds = new Set(existingWidgets.map(w => w.id));
        const incomingIds = new Set<string>();
        const layout = (data.layout as any) || (updated.layout as any) || { cols: 12, items: [] };
        const idMap = new Map<string, string>();

        for (let i = 0; i < data.widgets.length; i++) {
            const w = data.widgets[i];
            const layoutItem = layout.items?.find((item: any) => item.widgetId === w.id);
            const position = layoutItem ? { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } : { x: 0, y: i * 2, w: 6, h: 2 };
            const widgetData = {
                title: w.title || `Widget ${i + 1}`,
                type: w.type || 'metric',
                dataSource: w.dataSource || '',
                config: { chartType: w.chartType, metrics: w.metrics } as any,
                position: position as any,
            };

            if (w.id && existingIds.has(w.id)) {
                // Update existing widget
                await prisma.dashboardWidget.update({ where: { id: w.id }, data: widgetData });
                incomingIds.add(w.id);
            } else {
                // Create new widget
                const created = await prisma.dashboardWidget.create({
                    data: { dashboardId: id, ...widgetData },
                });
                if (w.id) idMap.set(w.id, created.id);
                incomingIds.add(created.id);
            }
        }

        // Delete widgets that were removed
        const toDelete = [...existingIds].filter(eid => !incomingIds.has(eid));
        if (toDelete.length > 0) {
            await prisma.dashboardWidget.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Update layout with real widget IDs for newly created widgets
        if (idMap.size > 0 && layout.items?.length) {
            const updatedItems = layout.items.map((item: any) => ({
                ...item,
                widgetId: idMap.get(item.widgetId) || item.widgetId,
            }));
            await prisma.studioDashboard.update({
                where: { id },
                data: { layout: { ...layout, items: updatedItems } as any },
            });
        }
    }

    // Re-fetch with widgets
    const result = await prisma.studioDashboard.findUnique({
        where: { id },
        include: { widgets: true },
    });
    return (result || updated) as unknown as StudioDashboard;
}

export async function deleteDashboard(id: string, tenantId: string) {
    return prisma.studioDashboard.deleteMany({
        where: { id, tenantId },
    });
}

// ----------------------------------------------------------------------------
// DASHBOARD WIDGETS
// ----------------------------------------------------------------------------

export async function getDashboardWidgets(dashboardId: string) {
    return prisma.dashboardWidget.findMany({
        where: { dashboardId },
        orderBy: { createdAt: 'asc' },
    });
}

export async function createDashboardWidget(dashboardId: string, data: CreateWidgetInput) {
    return prisma.dashboardWidget.create({
        data: {
            dashboardId,
            title: data.title,
            type: data.type,
            dataSource: data.dataSource,
            config: data.config as any,
            position: data.position as any,
        },
    });
}

export async function updateDashboardWidget(id: string, data: UpdateWidgetInput) {
    return prisma.dashboardWidget.update({
        where: { id },
        data: {
            title: data.title,
            type: data.type,
            dataSource: data.dataSource,
            config: data.config as any,
            position: data.position as any,
        },
    });
}

export async function deleteDashboardWidget(id: string) {
    return prisma.dashboardWidget.delete({
        where: { id },
    });
}
