// PHASE 4: Real Estate Module Types

export interface Property {
  id: string;
  reference: string;
  type: 'HOUSE' | 'APARTMENT' | 'CONDO' | 'COMMERCIAL' | 'LAND' | 'WAREHOUSE';
  status: 'AVAILABLE' | 'UNDER_CONTRACT' | 'SOLD' | 'RENTED' | 'OFF_MARKET';
  address: PropertyAddress;
  details: PropertyDetails;
  price: number;
  priceType: 'SALE' | 'RENT_MONTHLY' | 'RENT_YEARLY';
  description?: string;
  features?: string[];
  images?: string[];
  virtualTourUrl?: string;
}

export interface PropertyAddress {
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  neighborhood?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropertyDetails {
  bedrooms?: number;
  bathrooms?: number;
  area: number; // in sqft
  lotSize?: number;
  yearBuilt?: number;
  parking?: number;
  floors?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  amenities?: string[];
}

export interface PropertyViewing {
  id: string;
  propertyId: string;
  customerId: string;
  agentId?: string;
  scheduledDate: Date;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feedback?: ViewingFeedback;
  notes?: string;
}

export interface ViewingFeedback {
  rating?: number; // 1-5
  interested: boolean;
  comments?: string;
  concerns?: string[];
}

export interface PropertyContract {
  id: string;
  contractNumber: string;
  propertyId: string;
  customerId: string;
  agentId?: string;
  type: 'SALE' | 'LEASE' | 'RENT';
  startDate: Date;
  endDate?: Date;
  amount: number;
  depositAmount?: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'CANCELLED';
  terms?: string;
  documents?: ContractDocument[];
}

export interface ContractDocument {
  name: string;
  type: string;
  url: string;
  signedBy?: string[];
  signedDate?: Date;
}

export interface LeadProperty {
  id: string;
  customerId: string;
  preferredTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  preferredLocations?: string[];
  requirements?: string[];
  status: 'NEW' | 'CONTACTED' | 'VIEWING_SCHEDULED' | 'OFFER_MADE' | 'CLOSED' | 'LOST';
}

export interface PropertyComparison {
  properties: Property[];
  criteria: ComparisonCriteria[];
}

export interface ComparisonCriteria {
  name: string;
  weight: number;
  values: Record<string, any>;
}

export interface MarketAnalysis {
  location: string;
  averagePrice: number;
  medianPrice: number;
  pricePerSqft: number;
  daysOnMarket: number;
  inventoryLevel: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  comparableProperties: Property[];
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  tenantId?: string;
  type: 'REPAIR' | 'MAINTENANCE' | 'INSPECTION' | 'EMERGENCY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reportedDate: Date;
  completedDate?: Date;
  cost?: number;
}
