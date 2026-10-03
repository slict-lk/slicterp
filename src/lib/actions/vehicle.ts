'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { vehicleSchema, type VehicleFormValues } from '@/lib/validations/automotive';
import { getCurrentUser } from '@/lib/auth';

export async function getVehicles() {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    return await (prisma as any).vehicle.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { make: 'asc' },
    });
}

export async function createVehicle(data: VehicleFormValues) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        const validated = vehicleSchema.parse(data);

        const vehicle = await (prisma as any).vehicle.create({
            data: {
                ...validated,
                tenantId: user.tenantId,
            },
        });

        revalidatePath('/automotive/vehicles');
        return { success: true, vehicle };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteVehicle(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        await (prisma as any).vehicle.delete({
            where: { id, tenantId: user.tenantId },
        });
        revalidatePath('/automotive/vehicles');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
