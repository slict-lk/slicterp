import { AutomotivePartForm } from '@/components/automotive/AutomotivePartForm';
import { getVehicles } from '@/lib/actions/vehicle';

export const dynamic = 'force-dynamic';

export default async function AutomotivePartsPage() {
    const vehicles = await getVehicles();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Parts Catalog</h2>
                    <p className="text-muted-foreground">Manage automotive spare parts and bearings.</p>
                </div>
            </div>
            <AutomotivePartForm vehicles={vehicles} />
        </div>
    );
}
