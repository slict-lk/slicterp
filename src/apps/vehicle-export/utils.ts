// Vehicle Export Module - Utility Functions

import { JAAI_REQUIRED_DESTINATIONS } from './constants';

// ============================================================================
// Stock Number Generator
// ============================================================================

/**
 * Generate a unique stock number for a vehicle
 * Format: SL-YYYY-NNN (e.g., SL-2026-001)
 */
export function generateStockNumber(year: number, sequence: number): string {
    return `SL-${year}-${String(sequence).padStart(3, '0')}`;
}

// ============================================================================
// Price Calculations
// ============================================================================

/**
 * Calculate total cost of acquisition (internal cost)
 */
export function calculateTotalCost(params: {
    purchasePrice: number;
    auctionFee: number;
    transportCost: number;
    repairCost: number;
    inspectionCost: number;
}): number {
    return (
        params.purchasePrice +
        params.auctionFee +
        params.transportCost +
        params.repairCost +
        params.inspectionCost
    );
}

/**
 * Calculate FOB (Free On Board) price
 * This is the price the customer pays for the vehicle at the port (before shipping)
 */
export function calculateFOB(params: {
    totalCost: number;
    marginPercent: number;
}): number {
    const margin = params.totalCost * (params.marginPercent / 100);
    return Math.ceil(params.totalCost + margin);
}

/**
 * Calculate CIF (Cost, Insurance, Freight) price
 * This is the total price including shipping to destination
 */
export function calculateCIF(params: {
    fobPrice: number;
    shippingCost: number;
    insurancePercent?: number; // Default 1.5%
}): number {
    const insuranceRate = params.insurancePercent ?? 1.5;
    const insuranceCost = params.fobPrice * (insuranceRate / 100);
    return Math.ceil(params.fobPrice + params.shippingCost + insuranceCost);
}

// ============================================================================
// Compliance Checks
// ============================================================================

/**
 * Check if JAAI inspection is required for a destination
 */
export function isJAAIRequired(destinationPort: string): boolean {
    return JAAI_REQUIRED_DESTINATIONS.includes(
        destinationPort as (typeof JAAI_REQUIRED_DESTINATIONS)[number]
    );
}

/**
 * Validate if a vehicle is ready for shipment
 * Returns an array of missing requirements
 */
export function validateShipmentReadiness(params: {
    mashoStatus: string;
    jaaiStatus: string;
    destinationPort: string;
}): { isReady: boolean; errors: string[] } {
    const errors: string[] = [];

    // Masho (Export Certificate) is always required
    if (params.mashoStatus !== 'RECEIVED') {
        errors.push('Export Certificate (Masho) not received');
    }

    // JAAI is required for Sri Lanka
    if (isJAAIRequired(params.destinationPort) && params.jaaiStatus !== 'RECEIVED') {
        errors.push(`JAAI Inspection required for ${params.destinationPort}`);
    }

    return {
        isReady: errors.length === 0,
        errors,
    };
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Calculate estimated arrival date based on departure and typical transit times
 */
export function calculateETA(etd: Date, destinationPort: string): Date {
    // Typical transit times in days from Japan
    const transitDays: Record<string, number> = {
        COLOMBO: 14,
        HAMBANTOTA: 14,
        MOMBASA: 21,
        DAR_ES_SALAAM: 25,
        DURBAN: 28,
        KARACHI: 10,
        CHITTAGONG: 12,
        DJIBOUTI: 18,
        OTHER: 30,
    };

    const days = transitDays[destinationPort] ?? 30;
    const eta = new Date(etd);
    eta.setDate(eta.getDate() + days);
    return eta;
}

// ============================================================================
// Formatters
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'JPY'): string {
    const locales: Record<string, string> = {
        JPY: 'ja-JP',
        USD: 'en-US',
        LKR: 'en-LK',
        KES: 'en-KE',
        ZAR: 'en-ZA',
    };

    return new Intl.NumberFormat(locales[currency] ?? 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format mileage for display
 */
export function formatMileage(km: number | null): string {
    if (km === null) return 'N/A';
    return `${km.toLocaleString()} km`;
}
