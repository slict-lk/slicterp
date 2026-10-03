export interface Property {
  id: string;
  title: string;
  description?: string;
  propertyType: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND' | 'INDUSTRIAL' | 'OTHER';
  listingType: 'SALE' | 'RENT' | 'LEASE';
  price: number;
  currency: string;
  status: 'AVAILABLE' | 'PENDING' | 'SOLD' | 'RENTED' | 'MAINTENANCE';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number; // in square feet/meters
  yearBuilt?: number;
  features?: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  _count?: {
    viewings: number;
    inquiries: number;
    documents: number;
    amenities: number;
  };
}

export interface PropertyFormData extends Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | '_count'> {
  // Additional form-specific fields if needed
}

export interface PropertyFilter {
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  listingType?: string[];
  bedrooms?: number;
  bathrooms?: number;
  status?: string[];
  city?: string;
  state?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'oldest';
}

export interface PropertyPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PropertyResponse {
  data: Property[];
  pagination: PropertyPagination;
}
