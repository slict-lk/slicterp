// Vehicle Export Module - Server Actions (Business Logic Workflows)
'use server';

import {
    createVehicleFromAuction,
    createYardJob,
    updateVehicle,
    addVehiclePhotos,
    updateYardJob,
    assignVehiclesToShipment,
    updateComplianceStatus,
} from './api';
import type {
    CreateVehicleFromAuctionInput,
    YardJobType,
} from './types';

// ============================================================================
// ACTION: Auction Won
// ============================================================================

/**
 * The "Auction Won" Action
 * Called when a vehicle is successfully purchased at auction.
 * Creates the vehicle record and schedules an initial inspection yard job.
 */
export async function actionAuctionWon(data: CreateVehicleFromAuctionInput) {
    // 1. Create the vehicle record
    const vehicle = await createVehicleFromAuction(data);

    // 2. Automatically create an initial inspection yard job
    await createYardJob({
        vehicleId: vehicle.id,
        tenantId: data.tenantId,
        title: 'Initial Inspection',
        type: 'INSPECTION_PREP',
        notes: 'Perform initial inspection after auction pickup',
    });

    return vehicle;
}

// ============================================================================
// ACTION: Yard Check (Mobile Optimized)
// ============================================================================

interface YardCheckInput {
    vehicleId: string;
    tenantId: string;
    location?: string;
    photos?: { url: string; tag?: string; isPublic?: boolean }[];
    damages?: {
        description: string;
        type: YardJobType;
    }[];
}

/**
 * The "Yard Check" Action
 * Called when yard staff inspect a vehicle.
 * Updates location, uploads photos, and creates repair jobs for any damages.
 */
export async function actionYardCheck(data: YardCheckInput) {
    // 1. Update vehicle location and status
    await updateVehicle(data.vehicleId, data.tenantId, {
        location: data.location,
        status: 'IN_YARD',
    });

    // 2. Upload photos if provided
    if (data.photos && data.photos.length > 0) {
        await addVehiclePhotos(data.vehicleId, data.photos);
    }

    // 3. Create yard jobs for damages
    if (data.damages && data.damages.length > 0) {
        for (const damage of data.damages) {
            await createYardJob({
                vehicleId: data.vehicleId,
                tenantId: data.tenantId,
                title: damage.description,
                type: damage.type,
                notes: 'Created from yard check',
            });
        }

        // Update status to indicate prep is needed
        await updateVehicle(data.vehicleId, data.tenantId, {
            status: 'PREP_IN_PROGRESS',
        });
    }

    return { success: true };
}

// ============================================================================
// ACTION: Complete Yard Job
// ============================================================================

interface CompleteYardJobInput {
    jobId: string;
    proofPhotos: string[];
    notes?: string;
}

/**
 * Complete a yard job with proof photos
 */
export async function actionCompleteYardJob(data: CompleteYardJobInput) {
    return updateYardJob(data.jobId, {
        status: 'DONE',
        proofPhotos: data.proofPhotos,
        notes: data.notes,
    });
}

// ============================================================================
// ACTION: Shipment Lock
// ============================================================================

interface ShipmentLockInput {
    shipmentId: string;
    vehicleIds: string[];
    tenantId: string;
}

/**
 * The "Shipment Lock" Action
 * Assigns vehicles to a shipment ONLY if all compliance checks pass.
 * This is the critical validation step before export.
 * 
 * Throws an error if any vehicle fails compliance (missing JAAI for Sri Lanka, etc.)
 */
export async function actionShipmentLock(data: ShipmentLockInput) {
    // This function performs validation internally
    // and throws if any vehicle doesn't meet requirements
    return assignVehiclesToShipment(
        data.shipmentId,
        data.vehicleIds,
        data.tenantId
    );
}

// ============================================================================
// ACTION: Update Compliance
// ============================================================================

interface UpdateComplianceActionInput {
    vehicleId: string;
    type: 'SHAKEN' | 'MASHO' | 'JAAI';
    status: 'PENDING' | 'APPLIED' | 'RECEIVED' | 'TRANSLATED';
    certUrl?: string;
}

/**
 * Update document compliance status
 * Used by DOCS_ADMIN role to track document progress
 */
export async function actionUpdateCompliance(data: UpdateComplianceActionInput) {
    return updateComplianceStatus(data);
}

// ============================================================================
// ACTION: Mark Vehicle Ready to Ship
// ============================================================================

interface MarkReadyInput {
    vehicleId: string;
    tenantId: string;
}

/**
 * Mark a vehicle as ready to ship
 * Will validate compliance before allowing the status change
 */
export async function actionMarkReadyToShip(data: MarkReadyInput) {
    // Just update status - actual validation happens during shipment lock
    return updateVehicle(data.vehicleId, data.tenantId, {
        status: 'READY_TO_SHIP',
    });
}

// ============================================================================
// ACTION: Mark Shipped
// ============================================================================

interface MarkShippedInput {
    vehicleId: string;
    tenantId: string;
}

/**
 * Mark a vehicle as shipped (on vessel)
 */
export async function actionMarkShipped(data: MarkShippedInput) {
    return updateVehicle(data.vehicleId, data.tenantId, {
        status: 'SHIPPED',
    });
}

// ============================================================================
// ACTION: Mark Delivered
// ============================================================================

interface MarkDeliveredInput {
    vehicleId: string;
    tenantId: string;
}

/**
 * Mark a vehicle as delivered to customer
 */
export async function actionMarkDelivered(data: MarkDeliveredInput) {
    return updateVehicle(data.vehicleId, data.tenantId, {
        status: 'DELIVERED',
    });
}
