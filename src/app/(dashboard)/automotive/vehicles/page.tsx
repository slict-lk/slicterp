import { getVehicles } from '@/lib/actions/vehicle';
import { VehicleManager } from '@/components/automotive/VehicleManager';

export const dynamic = 'force-dynamic';

export default async function VehicleDatabasePage() {
    const vehicles = await getVehicles();

    return <VehicleManager initialVehicles={vehicles} />;
}
