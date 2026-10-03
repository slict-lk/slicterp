// Vehicle Export Module - Constants

// ============================================================================
// Japanese Auction Houses
// ============================================================================

export const AUCTION_HOUSES = [
    'USS Tokyo',
    'USS Yokohama',
    'USS Nagoya',
    'USS Osaka',
    'USS Kobe',
    'USS Fukuoka',
    'JAA',
    'TAA',
    'CAA',
    'HAA Kobe',
    'AUCNET',
    'ZIP',
    'Other',
] as const;

export type AuctionHouse = typeof AUCTION_HOUSES[number];

// ============================================================================
// Japanese Ports
// ============================================================================

export const DEPARTURE_PORTS = [
    'YOKOHAMA',
    'NAGOYA',
    'OSAKA',
    'KOBE',
    'HAKATA',
    'TOYAMA',
    'KAWASAKI',
] as const;

export type DeparturePort = typeof DEPARTURE_PORTS[number];

// ============================================================================
// Destination Ports
// ============================================================================

export const DESTINATION_PORTS = [
    // Sri Lanka
    'COLOMBO',
    'HAMBANTOTA',
    // East Africa
    'MOMBASA',      // Kenya
    'DAR_ES_SALAAM', // Tanzania
    'DURBAN',       // South Africa
    // Other
    'KARACHI',      // Pakistan
    'CHITTAGONG',   // Bangladesh
    'DJIBOUTI',
    'OTHER',
] as const;

export type DestinationPort = typeof DESTINATION_PORTS[number];

// Ports that require JAAI inspection for Sri Lanka compliance
export const JAAI_REQUIRED_DESTINATIONS = ['COLOMBO', 'HAMBANTOTA'] as const;

// ============================================================================
// Shipping Lines
// ============================================================================

export const SHIPPING_LINES = [
    'NYK',
    'MOL',
    'K-LINE',
    'HOEGH',
    'EUKOR',
    'WALLENIUS WILHELMSEN',
    'GRIMALDI',
    'OTHER',
] as const;

export type ShippingLine = typeof SHIPPING_LINES[number];

// ============================================================================
// Fuel Types
// ============================================================================

export const FUEL_TYPES = [
    'PETROL',
    'DIESEL',
    'HYBRID',
    'PLUG_IN_HYBRID',
    'EV',
    'LPG',
] as const;

export type FuelType = typeof FUEL_TYPES[number];

// ============================================================================
// Transmission Types
// ============================================================================

export const TRANSMISSION_TYPES = [
    'AT',   // Automatic
    'MT',   // Manual
    'CVT',  // Continuously Variable
    'DCT',  // Dual Clutch
] as const;

export type TransmissionType = typeof TRANSMISSION_TYPES[number];

// ============================================================================
// Vehicle Photo Tags
// ============================================================================

export const PHOTO_TAGS = [
    'FRONT',
    'REAR',
    'LEFT',
    'RIGHT',
    'INTERIOR',
    'DASHBOARD',
    'ENGINE',
    'TRUNK',
    'DAMAGE',
    'REPAIR_PROOF',
    'AUCTION_SHEET',
    'DOCUMENT',
] as const;

export type PhotoTag = typeof PHOTO_TAGS[number];

// ============================================================================
// Status Labels (for UI)
// ============================================================================

export const EXPORT_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    BID_PENDING: 'Bid Pending',
    BID_ACCEPTED: 'Bid Accepted',
    WON_AT_AUCTION: 'Won at Auction',
    IN_YARD: 'In Yard',
    PREP_IN_PROGRESS: 'Prep in Progress',
    INSPECTION_BOOKED: 'Inspection Booked',
    INSPECTION_PASSED: 'Inspection Passed',
    INSPECTION_FAILED: 'Inspection Failed',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
};

export const DOC_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    APPLIED: 'Applied',
    RECEIVED: 'Received',
    TRANSLATED: 'Translated',
};

// ============================================================================
// Currency
// ============================================================================

export const CURRENCIES = ['JPY', 'USD', 'LKR', 'KES', 'ZAR'] as const;
export type Currency = typeof CURRENCIES[number];
