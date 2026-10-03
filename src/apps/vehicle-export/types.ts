// Vehicle Export Module - Type Definitions

import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;

// ============================================================================
// Enums (Matching Prisma Schema)
// ============================================================================

export type ExportStatus =
    | 'DRAFT'
    | 'BID_PENDING'
    | 'BID_ACCEPTED'
    | 'WON_AT_AUCTION'
    | 'IN_YARD'
    | 'PREP_IN_PROGRESS'
    | 'INSPECTION_BOOKED'
    | 'INSPECTION_PASSED'
    | 'INSPECTION_FAILED'
    | 'READY_TO_SHIP'
    | 'SHIPPED'
    | 'DELIVERED';

export type DocStatus = 'PENDING' | 'APPLIED' | 'RECEIVED' | 'TRANSLATED';

export type ExportBidStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WON' | 'LOST';

export type ExportShipmentStatus = 'BOOKED' | 'SAILED' | 'ARRIVED';

export type YardJobType = 'REPAIR' | 'CLEANING' | 'INSPECTION_PREP' | 'VANNING';

export type YardJobStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

// ============================================================================
// Model Interfaces
// ============================================================================

export interface ExportCustomer {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    country: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExportVehicle {
    id: string;
    tenantId: string;
    stockNumber: string;
    chassisNumber: string;
    make: string;
    model: string;
    year: number;
    month: number | null;
    engineCode: string | null;
    fuelType: string | null;
    color: string | null;
    steering: string;
    transmission: string | null;
    mileage: number | null;
    engineCc: number | null;

    // Auction Data
    auctionHouse: string | null;
    auctionDate: Date | null;
    lotNumber: string | null;
    auctionGrade: string | null;
    auctionSheetUrl: string | null;

    // Financials
    purchasePrice: Decimal;
    auctionFee: Decimal;
    transportCost: Decimal;
    repairCost: Decimal;
    inspectionCost: Decimal;
    shippingCost: Decimal;
    fobPrice: Decimal;
    cifPrice: Decimal;
    currency: string;

    // Status
    status: ExportStatus;
    location: string | null;
    isPublished: boolean;

    // Compliance
    shakenStatus: DocStatus;
    mashoStatus: DocStatus;
    exportCertUrl: string | null;
    jaaiStatus: DocStatus;
    jaaiCertUrl: string | null;

    // Relations
    customerId: string | null;
    shipmentId: string | null;

    createdAt: Date;
    updatedAt: Date;
}

export interface ExportVehiclePhoto {
    id: string;
    vehicleId: string;
    url: string;
    tag: string | null;
    isPublic: boolean;
    createdAt: Date;
}

export interface ExportBid {
    id: string;
    tenantId: string;
    vehicleId: string | null;
    customerId: string;
    requestedMake: string;
    requestedModel: string;
    maxBudget: Decimal;
    currency: string;
    notes: string | null;
    status: ExportBidStatus;
    adminNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExportShipment {
    id: string;
    tenantId: string;
    shipmentNumber: string;
    vesselName: string;
    voyageNumber: string;
    shippingLine: string;
    departurePort: string;
    destinationPort: string;
    etd: Date;
    eta: Date;
    billOfLading: string | null;
    blUrl: string | null;
    consignee: string | null;
    status: ExportShipmentStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface YardJob {
    id: string;
    vehicleId: string;
    title: string;
    type: YardJobType;
    status: YardJobStatus;
    assignedTo: string | null;
    completedAt: Date | null;
    notes: string | null;
    proofPhotos: string[];
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateVehicleFromAuctionInput {
    tenantId: string;
    chassisNumber: string;
    make: string;
    model: string;
    year: number;
    purchasePrice: number;
    auctionHouse?: string;
    auctionDate?: Date;
    lotNumber?: string;
    auctionGrade?: string;
    auctionSheetUrl?: string;
    auctionFee?: number;
}

export interface CreateBidInput {
    tenantId: string;
    customerEmail: string;
    customerName: string;
    vehicleId?: string;
    requestedMake: string;
    requestedModel: string;
    maxBudget: number;
    currency?: string;
    notes?: string;
}

export interface UpdateComplianceInput {
    vehicleId: string;
    type: 'SHAKEN' | 'MASHO' | 'JAAI';
    status: DocStatus;
    certUrl?: string;
}

export interface CreateShipmentInput {
    tenantId: string;
    vesselName: string;
    voyageNumber: string;
    shippingLine: string;
    departurePort: string;
    destinationPort: string;
    etd: Date;
    eta: Date;
    consignee?: string;
}

export interface CreateYardJobInput {
    vehicleId: string;
    tenantId: string;
    title: string;
    type: YardJobType;
    assignedTo?: string;
    notes?: string;
}

export interface InventoryFilters {
    status?: ExportStatus;
    make?: string;
    model?: string;
    minPrice?: number;
    maxPrice?: number;
    publicOnly?: boolean;
}

// ============================================================================
// Public API Types (for Kobemotor Website)
// ============================================================================

export interface PublicVehicle {
    id: string;
    stockNumber: string;
    make: string;
    model: string;
    year: number;
    mileage: number | null;
    fuelType: string | null;
    transmission: string | null;
    color: string | null;
    fobPrice: number;
    currency: string;
    photos: { url: string; tag: string | null }[];
}
