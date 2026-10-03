'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function searchCompatibleParts(criteria: {
    make: string;
    model: string;
    year?: string;
}) {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        // Construct search term to match how we save it: "Make Model"
        // e.g. "Toyota Corolla"
        const searchTerm = `${criteria.make} ${criteria.model}`;

        // Fetch parts. Since vehicleModels is string[], we can't easily do partial string match inside the array with standard Prisma
        // We will fetch recent parts and filter or use raw query if needed. 
        // For MVP, we will fetch parts that MIGHT match (e.g. correct category) and filter in memory, 
        // OR we rely on the user selecting the EXACT vehicle string in the form.
        // Let's assume the user selects the exact vehicle from the DB in the creating form.

        // If we want to be smart, we find the Vehicle record first to get the exact string format
        // But the form saves "Make Model (Year-Year)"

        // Let's try to match items where vehicleModels array has an item containing "Make Model"
        // Prisma doesn't support "array element contains substring" easily.

        // FALLBACK: Fetch all AutomotiveParts and filter in memory (OK for small scale demo)
        const allParts = await (prisma as any).automotivePart.findMany({
            where: { tenantId: user.tenantId },
            include: { product: true },
            take: 100
        });

        return allParts.filter((part: any) => {
            return part.vehicleModels.some((vm: string) => vm.toLowerCase().includes(searchTerm.toLowerCase()));
        });

    } catch (error) {
        console.error('Fitment search failed:', error);
        return [];
    }
}

export async function searchVehicles(query: string) {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        if (!query || query.length < 2) return [];

        const vehicles = await (prisma as any).vehicle.findMany({
            where: {
                tenantId: user.tenantId,
                OR: [
                    { make: { contains: query, mode: 'insensitive' } },
                    { model: { contains: query, mode: 'insensitive' } },
                    { engine: { contains: query, mode: 'insensitive' } },
                ]
            },
            take: 10,
            orderBy: { yearStart: 'desc' }
        });

        return vehicles;
    } catch (error) {
        console.error('Vehicle search failed:', error);
        return [];
    }
}

// Enhanced General Part Search (for Shop Mode & Fuzzy Search)
export async function searchPartsFuzzy(query: string) {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        if (!query || query.length < 2) return [];

        return await (prisma as any).automotivePart.findMany({
            where: {
                tenantId: user.tenantId,
                OR: [
                    { oemCode: { contains: query, mode: 'insensitive' } },
                    { interchangeNumbers: { contains: query, mode: 'insensitive' } },
                    { product: { name: { contains: query, mode: 'insensitive' } } },
                    { product: { sku: { contains: query, mode: 'insensitive' } } },
                ]
            },
            include: {
                product: true
            },
            take: 20
        });
    } catch (error) {
        console.error('Fuzzy search failed:', error);
        return [];
    }
}
