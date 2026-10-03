/**
 * POST /api/ai/groq/tasks/sql-query
 * Generate SQL queries from natural language
 * SECURITY WARNING: Validate all queries before execution!
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { generateSQLQuery } from '@/lib/ai/erp-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt, schemaDescription } = body;

    if (!prompt || !schemaDescription) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['prompt', 'schemaDescription'],
        },
        { status: 400 }
      );
    }

    // Additional security check: Only allow SELECT queries
    const queryInfo = await generateSQLQuery(prompt, schemaDescription);

    // Verify the generated query is safe
    const upperQuery = queryInfo.query.toUpperCase().trim();
    const forbiddenKeywords = ['DELETE', 'DROP', 'UPDATE', 'INSERT', 'ALTER', 'GRANT', 'REVOKE'];
    const isForbidden = forbiddenKeywords.some(keyword => 
      upperQuery.startsWith(keyword) || upperQuery.includes(` ${keyword}`)
    );

    if (isForbidden) {
      return NextResponse.json(
        {
          error: 'Generated query contains forbidden operations. Only SELECT queries are allowed.',
          warning: '⚠️ Security prevented execution of potentially dangerous query',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      query: queryInfo.query,
      explanation: queryInfo.explanation,
      warning: queryInfo.warning,
      security: '⚠️ Always validate and test SQL queries in a safe environment first!',
    });
  } catch (error: any) {
    console.error('Error generating SQL query:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
