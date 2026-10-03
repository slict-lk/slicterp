import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, AlertTriangle, ArrowUpRight, DollarSign } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getStats() {
    const user = await getCurrentUser();
    if (!user) return { partCount: 0, lowStockCount: 0, vehicleCount: 0 };

    const [partCount, lowStockCount, vehicleCount] = await Promise.all([
        (prisma as any).automotivePart.count({ where: { tenantId: user.tenantId } }),
        prisma.product.count({
            where: {
                tenantId: user.tenantId,
                stockQty: { lte: 5 }, // Low stock threshold
                isActive: true
            }
        }),
        (prisma as any).vehicle.count({ where: { tenantId: user.tenantId } })
    ]);

    return { partCount, lowStockCount, vehicleCount };
}

export default async function AutomotiveDashboard() {
    const stats = await getStats();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Automotive Dashboard</h2>
                    <p className="text-muted-foreground">Overview of your parts inventory and performance.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.partCount}</div>
                        <p className="text-xs text-muted-foreground">Active SKUs</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">Items below minimum</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vehicle Database</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.vehicleCount}</div>
                        <p className="text-xs text-muted-foreground">Registered Models</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0.00</div>
                        <p className="text-xs text-muted-foreground">Inventory valuation</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                            No recent activity
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Popular Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                            No data available
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
