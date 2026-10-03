import { z } from 'zod';

// Property Types
export const propertyTypes = [
  'APARTMENT',
  'HOUSE',
  'CONDO',
  'TOWNHOUSE',
  'COMMERCIAL',
  'LAND',
  'VILLA',
  'STUDIO',
  'PENTHOUSE',
  'DUPLEX',
] as const;

export const listingTypes = ['SALE', 'RENT', 'LEASE'] as const;

export const propertyStatuses = [
  'AVAILABLE',
  'PENDING',
  'SOLD',
  'RENTED',
  'OFF_MARKET',
  'UNDER_CONTRACT',
] as const;

// Base property schema
export const propertyCreateSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  propertyType: z.enum(propertyTypes),
  listingType: z.enum(listingTypes),

  // Location
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().default('USA'),
  latitude: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(-90).max(90).optional()
  ),
  longitude: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(-180).max(180).optional()
  ),

  // Details - with coercion for form inputs
  bedrooms: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0).optional()
  ),
  bathrooms: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive().optional()
  ),
  area: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive().optional()
  ),
  price: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().positive('Price must be greater than 0')
  ),
  currency: z.string().default('USD'),
  status: z.enum(propertyStatuses).default('AVAILABLE'),

  // Media
  images: z.array(z.string().url()).default([]),
  videoUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),

  // Flags
  featured: z.boolean().default(false),
  verified: z.boolean().default(false),
});

export const propertyUpdateSchema = propertyCreateSchema.partial().extend({
  id: z.string().min(1),
});

// Property search/filter schema
export const propertySearchSchema = z.object({
  tenantId: z.string().optional(),
  keyword: z.string().optional(),
  propertyType: z.enum(propertyTypes).optional(),
  listingType: z.enum(listingTypes).optional(),
  status: z.enum(propertyStatuses).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minBedrooms: z.number().int().min(0).optional(),
  maxBedrooms: z.number().int().min(0).optional(),
  minBathrooms: z.number().positive().optional(),
  maxBathrooms: z.number().positive().optional(),
  minArea: z.number().positive().optional(),
  maxArea: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),

  // Sorting
  sortBy: z.enum(['createdAt', 'price', 'bedrooms', 'area', 'title', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Saved search schema
export const savedSearchSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  criteria: z.record(z.any()),
  emailNotifications: z.boolean().default(true),
  frequency: z.enum(['DAILY', 'WEEKLY', 'INSTANT']).default('DAILY'),
});

// Virtual tour schema
export const virtualTourSchema = z.object({
  propertyId: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  tourType: z.enum(['360_IMAGE', 'VIDEO', 'MATTERPORT', 'EMBEDDED']),
  url: z.string().url(),
  embedCode: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  thumbnail: z.string().url().optional(),
});

// Neighborhood insight schema
export const neighborhoodInsightSchema = z.object({
  propertyId: z.string().min(1),
  walkScore: z.number().int().min(0).max(100).optional(),
  transitScore: z.number().int().min(0).max(100).optional(),
  bikeScore: z.number().int().min(0).max(100).optional(),
  medianIncome: z.number().positive().optional(),
  populationCount: z.number().int().positive().optional(),
  medianAge: z.number().positive().optional(),
  crimeRate: z.enum(['LOW', 'MODERATE', 'HIGH']).optional(),
  schools: z.array(z.object({
    name: z.string(),
    rating: z.number().min(0).max(10),
    distance: z.number().positive(),
    type: z.string(),
  })).optional(),
  amenities: z.array(z.object({
    name: z.string(),
    category: z.string(),
    distance: z.number().positive(),
  })).optional(),
  pointsOfInterest: z.array(z.object({
    name: z.string(),
    category: z.string(),
    distance: z.number().positive(),
  })).optional(),
  publicTransport: z.array(z.object({
    type: z.string(),
    name: z.string(),
    distance: z.number().positive(),
  })).optional(),
  additionalData: z.record(z.any()).optional(),
});

// Property viewing schema
export const propertyViewingSchema = z.object({
  propertyId: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

// Property inquiry schema
export const propertyInquirySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
});

// Property view tracking schema
export const propertyViewTrackingSchema = z.object({
  propertyId: z.string().min(1),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  source: z.enum(['SEARCH', 'DIRECT', 'EMAIL', 'SOCIAL', 'OTHER']).optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

// Types
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertySearchParams = z.infer<typeof propertySearchSchema>;
export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
export type VirtualTourInput = z.infer<typeof virtualTourSchema>;
export type NeighborhoodInsightInput = z.infer<typeof neighborhoodInsightSchema>;
export type PropertyViewingInput = z.infer<typeof propertyViewingSchema>;
export type PropertyInquiryInput = z.infer<typeof propertyInquirySchema>;
export type PropertyViewTrackingInput = z.infer<typeof propertyViewTrackingSchema>;

