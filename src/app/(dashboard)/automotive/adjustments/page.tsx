import { getStockMovements, getWarehouses } from '@/lib/actions/stock';
import { StockAdjustmentManager } from '@/components/automotive/StockAdjustmentManager';

export const dynamic = 'force-dynamic';

export default async function StockAdjustmentsPage() {
    const movements = await getStockMovements();
    const warehouses = await getWarehouses();

    return <StockAdjustmentManager initialMovements={movements} warehouses={warehouses} />;
}
