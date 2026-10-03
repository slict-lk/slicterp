'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { automotivePartSchema, type AutomotivePartFormValues } from '@/lib/validations/automotive';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function createAutomotivePart(data: AutomotivePartFormValues) {
    try {
        // 1. Validate input
        const validatedFields = automotivePartSchema.parse(data);

        // 2. Get User Tenant
        const user = await getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        // 3. Transaction to create Product and AutomotivePart
        const newProduct = await prisma.$transaction(async (tx) => {
            // Create Base Product
            const product = await tx.product.create({
                data: {
                    tenantId: user.tenantId,
                    name: validatedFields.name,
                    sku: validatedFields.sku,
                    description: validatedFields.remarks, // Use remarks as description fallback or keep separate
                    type: 'STORABLE',
                    salePrice: validatedFields.salePrice,
                    costPrice: validatedFields.costPrice,
                    stockQty: validatedFields.stockQty,
                    minStockQty: validatedFields.minStockQty,
                    category: validatedFields.category || 'Automotive',
                    isActive: true,
                },
            });

            // Create Automotive Specifics
            await (tx as any).automotivePart.create({
                data: {
                    tenantId: user.tenantId,
                    productId: product.id,
                    partType: validatedFields.partType,
                    condition: validatedFields.condition,
                    oemCode: validatedFields.oemCode,
                    interchangeNumbers: validatedFields.interchangeNumbers,
                    brandOrigin: validatedFields.brandOrigin,
                    warrantyPeriod: validatedFields.warrantyPeriod,
                    remarks: validatedFields.remarks,
                    innerDiameter: validatedFields.innerDiameter,
                    outerDiameter: validatedFields.outerDiameter,
                    width: validatedFields.width,
                    clearance: validatedFields.clearance,
                    sealType: validatedFields.sealType,
                    vehicleModels: validatedFields.vehicleModels,
                    rackLocation: validatedFields.rackLocation,
                },
            });

            return product;
        });

        // 4. Revalidate
        revalidatePath('/automotive/parts');
        revalidatePath('/automotive'); // Dashboard

        return { success: true, message: 'Part created successfully', productId: newProduct.id };

    } catch (error: any) {
        console.error('Failed to create automotive part:', error);
        return {
            success: false,
            message: error.message || 'Failed to create part. Check SKU uniqueness.'
        };
    }
}
