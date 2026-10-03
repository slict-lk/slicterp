import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
  };

  // Check if DATABASE_URL exists (without exposing the value)
  diagnostics.hasDatabaseUrl = !!process.env.DATABASE_URL;
  diagnostics.hasDirectUrl = !!process.env.DIRECT_URL;
  
  // Extract safe connection info
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      diagnostics.databaseHost = url.hostname;
      diagnostics.databasePort = url.port;
      diagnostics.databaseName = url.pathname.replace('/', '');
      diagnostics.databaseUser = url.username;
      diagnostics.sslMode = url.searchParams.get('sslmode');
    } catch (e) {
      diagnostics.urlParseError = 'Failed to parse DATABASE_URL';
    }
  }

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.connectionStatus = 'connected';
    
    // Get database info
    const dbInfo = await prisma.$queryRaw<any[]>`
      SELECT current_database() as database, 
             current_user as user, 
             version() as version
    `;
    
    if (dbInfo && dbInfo.length > 0) {
      diagnostics.database = dbInfo[0].database;
      diagnostics.currentUser = dbInfo[0].user;
      diagnostics.postgresVersion = dbInfo[0].version?.split(' ')[1] || 'unknown';
    }
    
    // Test user table access (this is where the error occurs)
    try {
      await prisma.user.findFirst();
      diagnostics.userTableAccess = 'success';
    } catch (userError: any) {
      diagnostics.userTableAccess = 'failed';
      diagnostics.userTableError = userError.message;
      
      // Check if it's a permission error
      if (userError.message.includes('denied access') || userError.message.includes('permission')) {
        diagnostics.permissionError = true;
      }
    }
    
  } catch (error: any) {
    diagnostics.connectionStatus = 'failed';
    diagnostics.connectionError = error.message;
    
    // Check if it's a permission error
    if (error.message.includes('denied access') || error.message.includes('permission')) {
      diagnostics.permissionError = true;
    }
  }

  return NextResponse.json(diagnostics);
}
