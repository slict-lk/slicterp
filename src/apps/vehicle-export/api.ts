// Vehicle Export Module - API Functions (Server-side DB Access)

import { prisma } from '@/lib/prisma';
import type {
    CreateVehicleFromAuctionInput,
    CreateBidInput,
    UpdateComplianceInput,
    CreateShipmentInput,
    CreateYardJobInput,
    InventoryFilters,
    PublicVehicle,
    ExportStatus,
} from './types';
import { generateStockNumber, validateShipmentReadiness } from './utils';

// ============================================================================
// Stock Number Generation
// ============================================================================

async function getNextStockNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SL-${year}-`;

    const lastVehicle = await prisma.exportVehicle.findFirst({
        where: {
            tenantId,
            stockNumber: { startsWith: prefix },
        },
        orderBy: { stockNumber: 'desc' },
    });

    let sequence = 1;
    if (lastVehicle) {
        const lastSeq = parseInt(lastVehicle.stockNumber.split('-')[2], 10);
        sequence = lastSeq + 1;
    }

    return generateStockNumber(year, sequence);
}

async function getNextShipmentNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SHP-${year}-`;

    const lastShipment = await prisma.exportShipment.findFirst({
        where: {
            tenantId,
            shipmentNumber: { startsWith: prefix },
        },
        orderBy: { shipmentNumber: 'desc' },
    });

    let sequence = 1;
    if (lastShipment) {
        const lastSeq = parseInt(lastShipment.shipmentNumber.split('-')[2], 10);
        sequence = lastSeq + 1;
    }

    return `SHP-${year}-${String(sequence).padStart(3, '0')}`;
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * Get vehicle inventory with filters
 */
export async function getInventory(tenantId: string, filters?: InventoryFilters) {
    const where: any = { tenantId };

    if (filters?.status) {
        where.status = filters.status;
    }
    if (filters?.make) {
        where.make = { contains: filters.make, mode: 'insensitive' };
    }
    if (filters?.model) {
        where.model = { contains: filters.model, mode: 'insensitive' };
    }
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
        where.fobPrice = {};
        if (filters.minPrice !== undefined) where.fobPrice.gte = filters.minPrice;
        if (filters.maxPrice !== undefined) where.fobPrice.lte = filters.maxPrice;
    }
    if (filters?.publicOnly) {
        where.isPublished = true;
    }

    return prisma.exportVehicle.findMany({
        where,
        include: {
            photos: filters?.publicOnly ? { where: { isPublic: true } } : true,
            customer: true,
            shipment: true,
            _count: {
                select: { bids: true, yardJobs: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get a single vehicle by ID
 */
export async function getVehicleById(id: string, tenantId: string) {
    return prisma.exportVehicle.findFirst({
        where: { id, tenantId },
        include: {
            photos: true,
            customer: true,
            shipment: true,
            bids: {
                include: { customer: true },
                orderBy: { createdAt: 'desc' },
            },
            yardJobs: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });
}

/**
 * Create a vehicle from auction data (Quick Entry for Auction Team)
 */
export async function createVehicleFromAuction(data: CreateVehicleFromAuctionInput) {
    const stockNumber = await getNextStockNumber(data.tenantId);

    return prisma.exportVehicle.create({
        data: {
            tenantId: data.tenantId,
            stockNumber,
            chassisNumber: data.chassisNumber,
            make: data.make,
            model: data.model,
            year: data.year,
            purchasePrice: data.purchasePrice,
            auctionHouse: data.auctionHouse,
            auctionDate: data.auctionDate,
            lotNumber: data.lotNumber,
            auctionGrade: data.auctionGrade,
            auctionSheetUrl: data.auctionSheetUrl,
            auctionFee: data.auctionFee ?? 0,
            status: 'WON_AT_AUCTION',
        },
    });
}

/**
 * Update vehicle details
 */
export async function updateVehicle(
    id: string,
    tenantId: string,
    data: Partial<{
        make: string;
        model: string;
        year: number;
        month: number;
        engineCode: string;
        fuelType: string;
        color: string;
        transmission: string;
        mileage: number;
        engineCc: number;
        location: string;
        status: ExportStatus;
        fobPrice: number;
        cifPrice: number;
        isPublished: boolean;
    }>
) {
    return prisma.exportVehicle.update({
        where: { id },
        data,
    });
}

// ============================================================================
// COMPLIANCE GATEKEEPER
// ============================================================================

/**
 * Update compliance document status
 */
export async function updateComplianceStatus(data: UpdateComplianceInput) {
    const updateData: any = {};

    switch (data.type) {
        case 'SHAKEN':
            updateData.shakenStatus = data.status;
            break;
        case 'MASHO':
            updateData.mashoStatus = data.status;
            if (data.certUrl) updateData.exportCertUrl = data.certUrl;
            break;
        case 'JAAI':
            updateData.jaaiStatus = data.status;
            if (data.certUrl) updateData.jaaiCertUrl = data.certUrl;
            break;
    }

    return prisma.exportVehicle.update({
        where: { id: data.vehicleId },
        data: updateData,
    });
}

/**
 * Check if vehicle can be shipped (Compliance Gatekeeper)
 */
export async function canShipVehicle(vehicleId: string, destinationPort: string) {
    const vehicle = await prisma.exportVehicle.findUnique({
        where: { id: vehicleId },
    });

    if (!vehicle) {
        return { canShip: false, errors: ['Vehicle not found'] };
    }

    const validation = validateShipmentReadiness({
        mashoStatus: vehicle.mashoStatus,
        jaaiStatus: vehicle.jaaiStatus,
        destinationPort,
    });

    return {
        canShip: validation.isReady,
        errors: validation.errors,
    };
}

// ============================================================================
// PUBLIC VEHICLE CONNECTOR (For Kobemotor Website)
// ============================================================================

/**
 * Get vehicles for public website display
 */
export async function getPublicVehicles(tenantId: string): Promise<PublicVehicle[]> {
    const vehicles = await prisma.exportVehicle.findMany({
        where: {
            tenantId,
            isPublished: true,
        },
        include: {
            photos: {
                where: { isPublic: true },
                select: { url: true, tag: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return vehicles.map((v) => ({
        id: v.id,
        stockNumber: v.stockNumber,
        make: v.make,
        model: v.model,
        year: v.year,
        mileage: v.mileage,
        fuelType: v.fuelType,
        transmission: v.transmission,
        color: v.color,
        fobPrice: Number(v.fobPrice),
        currency: v.currency,
        photos: v.photos,
    }));
}

// ============================================================================
// BIDS
// ============================================================================

/**
 * Create a bid (from website or manual entry)
 */
export async function createBid(data: CreateBidInput) {
    // Find or create customer by email
    let customer = await prisma.exportCustomer.findFirst({
        where: { tenantId: data.tenantId, email: data.customerEmail },
    });

    if (!customer) {
        customer = await prisma.exportCustomer.create({
            data: {
                tenantId: data.tenantId,
                email: data.customerEmail,
                name: data.customerName,
            },
        });
    }

    return prisma.exportBid.create({
        data: {
            tenantId: data.tenantId,
            customerId: customer.id,
            vehicleId: data.vehicleId,
            requestedMake: data.requestedMake,
            requestedModel: data.requestedModel,
            maxBudget: data.maxBudget,
            currency: data.currency ?? 'JPY',
            notes: data.notes,
            status: 'PENDING',
        },
        include: {
            customer: true,
            vehicle: true,
        },
    });
}

/**
 * Update bid status
 */
export async function updateBidStatus(
    bidId: string,
    status: 'APPROVED' | 'REJECTED' | 'WON' | 'LOST',
    adminNotes?: string
) {
    return prisma.exportBid.update({
        where: { id: bidId },
        data: { status, adminNotes },
    });
}

/**
 * Get bids for a tenant
 */
export async function getBids(tenantId: string, options?: { status?: string; customerId?: string }) {
    const where: any = { tenantId };
    if (options?.status) where.status = options.status;
    if (options?.customerId) where.customerId = options.customerId;

    return prisma.exportBid.findMany({
        where,
        include: {
            customer: true,
            vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ============================================================================
// SHIPMENTS
// ============================================================================

/**
 * Create a shipment
 */
export async function createShipment(data: CreateShipmentInput) {
    const shipmentNumber = await getNextShipmentNumber(data.tenantId);

    return prisma.exportShipment.create({
        data: {
            tenantId: data.tenantId,
            shipmentNumber,
            vesselName: data.vesselName,
            voyageNumber: data.voyageNumber,
            shippingLine: data.shippingLine,
            departurePort: data.departurePort,
            destinationPort: data.destinationPort,
            etd: data.etd,
            eta: data.eta,
            consignee: data.consignee,
            status: 'BOOKED',
        },
    });
}

/**
 * Assign vehicles to shipment (with compliance validation)
 */
export async function assignVehiclesToShipment(
    shipmentId: string,
    vehicleIds: string[],
    tenantId: string
) {
    // Get shipment to know destination
    const shipment = await prisma.exportShipment.findFirst({
        where: { id: shipmentId, tenantId },
    });

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    // Validate each vehicle
    const errors: string[] = [];
    for (const vehicleId of vehicleIds) {
        const result = await canShipVehicle(vehicleId, shipment.destinationPort);
        if (!result.canShip) {
            const vehicle = await prisma.exportVehicle.findUnique({ where: { id: vehicleId } });
            errors.push(`${vehicle?.stockNumber ?? vehicleId}: ${result.errors.join(', ')}`);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Cannot assign vehicles:\n${errors.join('\n')}`);
    }

    // Assign all vehicles
    await prisma.exportVehicle.updateMany({
        where: { id: { in: vehicleIds } },
        data: {
            shipmentId,
            status: 'READY_TO_SHIP',
        },
    });

    return prisma.exportShipment.findFirst({
        where: { id: shipmentId },
        include: { vehicles: true },
    });
}

/**
 * Get shipments
 */
export async function getShipments(tenantId: string, options?: { status?: string }) {
    const where: any = { tenantId };
    if (options?.status) where.status = options.status;

    return prisma.exportShipment.findMany({
        where,
        include: {
            vehicles: true,
            _count: { select: { vehicles: true } },
        },
        orderBy: { etd: 'desc' },
    });
}

// ============================================================================
// YARD JOBS
// ============================================================================

/**
 * Create a yard job
 */
export async function createYardJob(data: CreateYardJobInput) {
    return prisma.yardJob.create({
        data: {
            vehicleId: data.vehicleId,
            tenantId: data.tenantId,
            title: data.title,
            type: data.type,
            assignedTo: data.assignedTo,
            notes: data.notes,
            status: 'TODO',
            proofPhotos: [],
        },
    });
}

/**
 * Update yard job status
 */
export async function updateYardJob(
    jobId: string,
    data: {
        status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
        proofPhotos?: string[];
        notes?: string;
    }
) {
    const updateData: any = { ...data };
    if (data.status === 'DONE') {
        updateData.completedAt = new Date();
    }

    return prisma.yardJob.update({
        where: { id: jobId },
        data: updateData,
    });
}

/**
 * Get yard jobs
 */
export async function getYardJobs(tenantId: string, options?: { vehicleId?: string; status?: string }) {
    const where: any = { tenantId };
    if (options?.vehicleId) where.vehicleId = options.vehicleId;
    if (options?.status) where.status = options.status;

    return prisma.yardJob.findMany({
        where,
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
    });
}

// ============================================================================
// PHOTOS
// ============================================================================

/**
 * Add photos to a vehicle
 */
export async function addVehiclePhotos(
    vehicleId: string,
    photos: { url: string; tag?: string; isPublic?: boolean }[]
) {
    return prisma.exportVehiclePhoto.createMany({
        data: photos.map((p) => ({
            vehicleId,
            url: p.url,
            tag: p.tag,
            isPublic: p.isPublic ?? true,
        })),
    });
}

/**
 * Delete a photo
 */
export async function deleteVehiclePhoto(photoId: string) {
    return prisma.exportVehiclePhoto.delete({
        where: { id: photoId },
    });
}

// ============================================================================
// CUSTOMERS
// ============================================================================

/**
 * Get customers
 */
export async function getCustomers(tenantId: string, options?: { search?: string }) {
    const where: any = { tenantId };
    if (options?.search) {
        where.OR = [
            { name: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
            { company: { contains: options.search, mode: 'insensitive' } },
        ];
    }

    return prisma.exportCustomer.findMany({
        where,
        include: {
            _count: { select: { vehicles: true, bids: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}
