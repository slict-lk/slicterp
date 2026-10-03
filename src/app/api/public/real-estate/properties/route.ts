import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const createCorsHeaders = (origin?: string | null) => {
  // Allow specific production domains and all localhost during development
  const allowedOrigins = [
    'https://properties.slict.lk',
    'https://property.slict.lk',
    'https://erp-git-apiconnect-slictteam.vercel.app', // Production Deployment
    'http://localhost:63342',  // JetBrains IDE server
    'http://localhost:3000',
    'http://127.0.0.1:63342',
    'http://127.0.0.1:3000',
  ];

  // Check if origin is in allowed list
  const isAllowed = origin && allowedOrigins.includes(origin);

  // In development, be more permissive with localhost and file://
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');
  const isFileProtocol = !origin || origin === 'null'; // file:// shows as null

  let allowedOrigin = '*';

  if (isAllowed) {
    allowedOrigin = origin!;
  } else if (isDev && isLocalhost) {
    allowedOrigin = origin!;
  } else if (isDev && isFileProtocol) {
    allowedOrigin = '*'; // Allow file:// in development
  } else if (isDev) {
    allowedOrigin = '*';
  }

  console.log('[CORS] Request from origin:', origin || 'file://', '→ Allowing:', allowedOrigin);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  } as Record<string, string>;
};

export async function GET(request: NextRequest) {
  console.log('[API] GET request received from:', request.headers.get('origin'));
  const corsHeaders = createCorsHeaders(request.headers.get('origin'));

  try {
    const properties = await prisma.property.findMany({
      where: { status: 'AVAILABLE' },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        address: true,
        city: true,
        propertyType: true,
        area: true,
        bedrooms: true,
        bathrooms: true,
        images: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    console.log(`[API] Returning ${properties.length} properties`);

    return NextResponse.json(properties, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching public properties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export function OPTIONS(request: NextRequest) {
  console.log('[API] OPTIONS preflight request from:', request.headers.get('origin'));
  const corsHeaders = createCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

