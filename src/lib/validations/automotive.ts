import * as z from 'zod';

export const automotivePartSchema = z.object({
    // Base Product Fields
    sku: z.string().min(1, 'Part Number/SKU is required'),
    name: z.string().min(2, 'Part Name is required'),
    category: z.string().optional(),
    salePrice: z.coerce.number().min(0),
    costPrice: z.coerce.number().min(0),
    stockQty: z.coerce.number().min(0),
    minStockQty: z.coerce.number().min(0),

    // Auto Specific Fields
    oemCode: z.string().optional(),
    interchangeNumbers: z.string().optional(),
    partType: z.enum(['BEARING', 'SPARE_PART', 'LUBRICANT', 'ACCESSORY', 'TOOL']),
    condition: z.enum(['NEW', 'USED', 'RECONDITIONED']),
    brandOrigin: z.string().optional(),
    warrantyPeriod: z.coerce.number().optional(), // In months
    remarks: z.string().optional(),

    // Bearing Specifics (Optional)
    innerDiameter: z.coerce.number().optional(),
    outerDiameter: z.coerce.number().optional(),
    width: z.coerce.number().optional(),
    clearance: z.string().optional(),
    sealType: z.string().optional(),

    // Compatibility
    vehicleModels: z.array(z.string()).default([]),
    rackLocation: z.string().optional(),
});

export type AutomotivePartFormValues = z.infer<typeof automotivePartSchema>;

export const vehicleSchema = z.object({
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    yearStart: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    yearEnd: z.coerce.number().optional().nullable(),
    engine: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
