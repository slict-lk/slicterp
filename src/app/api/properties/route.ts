import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { propertyCreateSchema, propertySearchSchema } from '@/lib/validations/property';


export const dynamic = 'force-dynamic';
// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error('API Error:', { message, status, details });
  return NextResponse.json(
    {
      error: message,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

// GET /api/properties - List properties with advanced search & pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate search parameters
    const params = {
      tenantId: searchParams.get('tenantId') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      propertyType: searchParams.get('propertyType') || undefined,
      listingType: searchParams.get('listingType') || searchParams.get('transactionType') || undefined,
      status: searchParams.get('status') || undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      minBedrooms: searchParams.get('minBedrooms') ? parseInt(searchParams.get('minBedrooms')!) : undefined,
      maxBedrooms: searchParams.get('maxBedrooms') ? parseInt(searchParams.get('maxBedrooms')!) : undefined,
      minBathrooms: searchParams.get('minBathrooms') ? parseFloat(searchParams.get('minBathrooms')!) : undefined,
      maxBathrooms: searchParams.get('maxBathrooms') ? parseFloat(searchParams.get('maxBathrooms')!) : undefined,
      minArea: searchParams.get('minArea') ? parseFloat(searchParams.get('minArea')!) : undefined,
      maxArea: searchParams.get('maxArea') ? parseFloat(searchParams.get('maxArea')!) : undefined,
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      verified: searchParams.get('verified') === 'true' ? true : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      sortBy: (searchParams.get('sortBy') || 'createdAt') as any,
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    };

    // Validate with Zod
    const validatedParams = propertySearchSchema.parse(params);

    // Build where clause with proper typing
    const whereClause: Prisma.PropertyWhereInput = {};

    if (validatedParams.tenantId) {
      whereClause.tenantId = validatedParams.tenantId;
    }

    if (validatedParams.status) {
      whereClause.status = validatedParams.status;
    }

    if (validatedParams.propertyType) {
      whereClause.propertyType = validatedParams.propertyType;
    }

    if (validatedParams.listingType) {
      whereClause.listingType = validatedParams.listingType;
    }

    if (validatedParams.featured !== undefined) {
      whereClause.featured = validatedParams.featured;
    }

    if (validatedParams.verified !== undefined) {
      whereClause.verified = validatedParams.verified;
    }

    // Keyword search across multiple fields
    if (validatedParams.keyword) {
      whereClause.OR = [
        { title: { contains: validatedParams.keyword, mode: 'insensitive' } },
        { description: { contains: validatedParams.keyword, mode: 'insensitive' } },
        { address: { contains: validatedParams.keyword, mode: 'insensitive' } },
        { city: { contains: validatedParams.keyword, mode: 'insensitive' } },
        { state: { contains: validatedParams.keyword, mode: 'insensitive' } },
      ];
    }

    // Location filters
    if (validatedParams.city && !validatedParams.keyword) {
      whereClause.city = { contains: validatedParams.city, mode: 'insensitive' };
    }

    if (validatedParams.state && !validatedParams.keyword) {
      whereClause.state = { contains: validatedParams.state, mode: 'insensitive' };
    }

    // Price range
    if (validatedParams.minPrice !== undefined || validatedParams.maxPrice !== undefined) {
      whereClause.price = {};
      if (validatedParams.minPrice !== undefined) {
        whereClause.price.gte = validatedParams.minPrice;
      }
      if (validatedParams.maxPrice !== undefined) {
        whereClause.price.lte = validatedParams.maxPrice;
      }
    }

    // Bedrooms range
    if (validatedParams.minBedrooms !== undefined || validatedParams.maxBedrooms !== undefined) {
      whereClause.bedrooms = {};
      if (validatedParams.minBedrooms !== undefined) {
        whereClause.bedrooms.gte = validatedParams.minBedrooms;
      }
      if (validatedParams.maxBedrooms !== undefined) {
        whereClause.bedrooms.lte = validatedParams.maxBedrooms;
      }
    }

    // Bathrooms range
    if (validatedParams.minBathrooms !== undefined || validatedParams.maxBathrooms !== undefined) {
      whereClause.bathrooms = {};
      if (validatedParams.minBathrooms !== undefined) {
        whereClause.bathrooms.gte = validatedParams.minBathrooms;
      }
      if (validatedParams.maxBathrooms !== undefined) {
        whereClause.bathrooms.lte = validatedParams.maxBathrooms;
      }
    }

    // Area range
    if (validatedParams.minArea !== undefined || validatedParams.maxArea !== undefined) {
      whereClause.area = {};
      if (validatedParams.minArea !== undefined) {
        whereClause.area.gte = validatedParams.minArea;
      }
      if (validatedParams.maxArea !== undefined) {
        whereClause.area.lte = validatedParams.maxArea;
      }
    }

    // Amenities filter (if amenities are provided)
    if (validatedParams.amenities && validatedParams.amenities.length > 0) {
      whereClause.amenities = {
        some: {
          name: {
            in: validatedParams.amenities,
          },
        },
      };
    }

    // Pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;
    const take = validatedParams.limit;

    // Build order by
    const orderBy: Prisma.PropertyOrderByWithRelationInput = {
      [validatedParams.sortBy]: validatedParams.sortOrder,
    };

    // Execute query with count
    const [properties, totalCount] = await Promise.all([
      prisma.property.findMany({
        where: whereClause,
        include: {
          amenities: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          agents: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  licenseNumber: true,
                },
              },
            },
          },
          virtualTours: {
            where: { isActive: true },
            select: {
              id: true,
              title: true,
              tourType: true,
              thumbnail: true,
            },
          },
          neighborhood: {
            select: {
              walkScore: true,
              transitScore: true,
              bikeScore: true,
              crimeRate: true,
            },
          },
          _count: {
            select: {
              favorites: true,
              views: true,
              inquiries: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.property.count({ where: whereClause }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPreviousPage = validatedParams.page > 1;

    return NextResponse.json({
      success: true,
      data: properties,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      filters: validatedParams,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid search parameters', 400, error.errors);
    }

    return errorResponse('Failed to fetch properties', 500, error);
  }
}

// POST /api/properties - Create property with validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validatedData = propertyCreateSchema.parse(body);

    const property = await prisma.property.create({
      data: {
        tenantId: validatedData.tenantId,
        title: validatedData.title,
        description: validatedData.description,
        propertyType: validatedData.propertyType,
        listingType: validatedData.listingType,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        bedrooms: validatedData.bedrooms,
        bathrooms: validatedData.bathrooms,
        area: validatedData.area,
        price: validatedData.price,
        currency: validatedData.currency,
        status: validatedData.status,
        images: validatedData.images,
        videoUrl: validatedData.videoUrl,
        virtualTourUrl: validatedData.virtualTourUrl,
        featured: validatedData.featured,
        verified: validatedData.verified,
      },
      include: {
        amenities: true,
        agents: {
          include: {
            agent: true,
          },
        },
      },
    });

    try {
      await publishModuleMutationEvent({
        tenantId: validatedData.tenantId,
        module: 'real-estate',
        entity: 'property',
        event: 'created',
        actorId: 'property-api',
        payload: {
          propertyId: property.id,
          title: property.title,
          status: property.status,
          listingType: property.listingType,
        },
      });
    } catch (publishError) {
      console.error('Failed to publish property mutation event:', { tenantId: validatedData.tenantId, propertyId: property.id, error: publishError });
    }

    return NextResponse.json({
      success: true,
      data: property,
      message: 'Property created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return errorResponse('Property with this information already exists', 409);
      }
    }

    return errorResponse('Failed to create property', 500, error);
  }
}

