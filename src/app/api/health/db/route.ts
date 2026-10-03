import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const isHealthy = await testDatabaseConnection(2);

    if (isHealthy) {
      return NextResponse.json({
        status: 'healthy',
        message: 'Database connection is active',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Database health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

