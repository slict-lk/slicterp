/**
 * ERP Task Handlers for Groq AI
 * Specialized functions for:
 * - Invoice generation
 * - Sales predictions
 * - Inventory forecasting
 * - Financial reports
 * - HR reports
 * - SQL query generation
 */

import { getGroqEngine } from './groq-engine';
import { ChatMessage } from './groq-client';
import { prisma } from '@/lib/prisma';
// The full table dictionary generated from prisma/schema.prisma (254 tables).
import tableDictionary from './table-dictionary.json';

export interface InvoiceRequest {
  clientName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  dueDate?: string;
  notes?: string;
}

export interface SalesPrediction {
  period: string;
  predictedRevenue: number;
  confidence: number;
  recommendations: string[];
}

export interface InventoryForecast {
  productId: string;
  currentStock: number;
  predictedDemand: number;
  recommendedReorder: number;
}

export interface FinancialReport {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  summary: string;
}

/**
 * Generate invoice from natural language input
 */
export async function generateInvoice(
  description: string,
  tenantId: string
): Promise<{
  invoiceData: InvoiceRequest;
  explanation: string;
}> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert ERP assistant. When asked to generate an invoice, extract the following information and return it as a JSON object:
{
  "clientName": "string",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number
    }
  ],
  "dueDate": "YYYY-MM-DD",
  "notes": "string"
}

After the JSON, provide a brief explanation of what invoice was created.`,
    },
    {
      role: 'user',
      content: `Generate an invoice from this request: ${description}`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.3, // Lower temperature for structured output
      maxTokens: 1500,
    });

    // Parse the response to extract JSON
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    let invoiceData: InvoiceRequest = {
      clientName: 'Unknown',
      items: [],
    };

    if (jsonMatch) {
      try {
        invoiceData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse invoice JSON:', e);
      }
    }

    return {
      invoiceData,
      explanation: result.response,
    };
  } catch (error: any) {
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
}

/**
 * Predict sales based on historical data and market trends
 */
export async function predictSales(
  historicalData: string,
  marketContext: string
): Promise<SalesPrediction> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert business analyst. Based on historical sales data and market context, provide a JSON prediction:
{
  "period": "string (e.g., 'Q1 2024')",
  "predictedRevenue": number,
  "confidence": number (0-1),
  "recommendations": ["string"]
}

Be data-driven and realistic with predictions.`,
    },
    {
      role: 'user',
      content: `Historical data: ${historicalData}\n\nMarket context: ${marketContext}\n\nProvide a sales prediction.`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.4,
      maxTokens: 1000,
    });

    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    let prediction: SalesPrediction = {
      period: 'Unknown',
      predictedRevenue: 0,
      confidence: 0,
      recommendations: [],
    };

    if (jsonMatch) {
      try {
        prediction = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse prediction JSON:', e);
      }
    }

    return prediction;
  } catch (error: any) {
    throw new Error(`Failed to predict sales: ${error.message}`);
  }
}

/**
 * Forecast inventory needs
 */
export async function forecastInventory(
  productData: string,
  demandTrends: string
): Promise<InventoryForecast[]> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an inventory optimization expert. Based on product data and demand trends, provide a JSON array of forecasts:
[
  {
    "productId": "string",
    "currentStock": number,
    "predictedDemand": number,
    "recommendedReorder": number
  }
]

Be conservative with reorder recommendations to avoid stockouts.`,
    },
    {
      role: 'user',
      content: `Product data: ${productData}\n\nDemand trends: ${demandTrends}\n\nProvide inventory forecasts.`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1500,
    });

    const jsonMatch = result.response.match(/\[[\s\S]*\]/);
    let forecasts: InventoryForecast[] = [];

    if (jsonMatch) {
      try {
        forecasts = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse inventory JSON:', e);
      }
    }

    return forecasts;
  } catch (error: any) {
    throw new Error(`Failed to forecast inventory: ${error.message}`);
  }
}

/**
 * Generate financial report from transaction data
 */
export async function generateFinancialReport(
  transactionData: string,
  period: string
): Promise<FinancialReport> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a financial analyst. Based on transaction data, generate a financial report in this JSON format:
{
  "period": "string",
  "totalRevenue": number,
  "totalExpenses": number,
  "netProfit": number,
  "summary": "string (2-3 sentences analysis)"
}

Be accurate and include key financial insights.`,
    },
    {
      role: 'user',
      content: `Transaction data for ${period}:\n${transactionData}\n\nGenerate a financial report.`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    let report: FinancialReport = {
      period,
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      summary: '',
    };

    if (jsonMatch) {
      try {
        report = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse financial report JSON:', e);
      }
    }

    return report;
  } catch (error: any) {
    throw new Error(`Failed to generate financial report: ${error.message}`);
  }
}

/**
 * Generate HR report (headcount, turnover, salary analysis)
 */
export async function generateHRReport(
  employeeData: string,
  period: string
): Promise<{
  totalHeadcount: number;
  turnoverRate: number;
  averageSalary: number;
  highlights: string[];
}> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an HR analytics expert. Based on employee data, generate a report in this JSON format:
{
  "totalHeadcount": number,
  "turnoverRate": number (0-1),
  "averageSalary": number,
  "highlights": ["string"]
}

Provide actionable HR insights.`,
    },
    {
      role: 'user',
      content: `Employee data for ${period}:\n${employeeData}\n\nGenerate an HR report.`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    let report = {
      totalHeadcount: 0,
      turnoverRate: 0,
      averageSalary: 0,
      highlights: [],
    };

    if (jsonMatch) {
      try {
        report = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse HR report JSON:', e);
      }
    }

    return report;
  } catch (error: any) {
    throw new Error(`Failed to generate HR report: ${error.message}`);
  }
}

/**
 * Generate SQL queries from natural language prompts
 * SECURITY NOTE: Use with extreme caution - always validate in production
 */
export async function generateSQLQuery(
  naturalLanguagePrompt: string,
  schemaDescription: string
): Promise<{
  query: string;
  explanation: string;
  warning?: string;
}> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a PostgreSQL expert. Based on a schema description, generate a safe SQL query.

IMPORTANT: Follow these security rules:
1. Only SELECT queries (never DELETE, DROP, UPDATE)
2. Always use parameterized queries with $1, $2, etc.
3. Include LIMIT to prevent large data transfers
4. Return query and explanation separately

Format your response as:
{
  "query": "string (SQL query)",
  "explanation": "string (what the query does)",
  "warning": "string (any security or performance concerns)"
}`,
    },
    {
      role: 'user',
      content: `Schema:\n${schemaDescription}\n\nGenerate SQL for: ${naturalLanguagePrompt}`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.2, // Very low temperature for code generation
      maxTokens: 1500,
    });

    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    let queryInfo = {
      query: '',
      explanation: result.response,
      warning: '⚠️ Always validate SQL queries before execution!',
    };

    if (jsonMatch) {
      try {
        queryInfo = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse SQL JSON:', e);
      }
    }

    return queryInfo;
  } catch (error: any) {
    throw new Error(`Failed to generate SQL query: ${error.message}`);
  }
}

/**
 * ── SAFE DATABASE EXECUTION LAYER ──
 *
 * This is the function that actually turns the chatbot's SQL into real rows.
 * It is the ONLY place in the codebase allowed to run SQL text produced by an LLM.
 * Every rule here exists because trusting the model directly caused fabricated answers.
 */

const TABLE_DICT = tableDictionary as Record<string, { columns: { name: string; type: string }[]; hasTenantId: boolean }>;

// The model often guesses conventional lowercase/plural table names (e.g. "admissions")
// instead of the exact PascalCase Prisma name ("Admission"). Build a case-insensitive
// lookup so we can recognize and auto-correct these instead of just rejecting them.
const LOWERCASE_TO_REAL_TABLE: Record<string, string> = {};
for (const realName of Object.keys(TABLE_DICT)) {
  LOWERCASE_TO_REAL_TABLE[realName.toLowerCase()] = realName;
}

// A tenantId from the session is a Prisma cuid: lowercase letters + digits, ~25 chars.
// Reject anything that doesn't look like that before it ever touches string interpolation.
const SAFE_TENANT_ID = /^[a-z0-9]{20,40}$/i;

// 'union' and 'intersect'/'except' are forbidden because the tenant-scope check below
// only asserts that $TENANT_ID appears somewhere in the statement - a second set-op
// arm would otherwise run completely unscoped and read across tenants.
const FORBIDDEN_KEYWORDS = /\b(insert|update|delete|drop|alter|grant|revoke|truncate|create|merge|call|copy|union|intersect|except)\b/i;

export interface SafeQueryResult {
  rows: any[];
  error?: string;
  sqlExecuted?: string; // for logging/debugging - never shown raw to the end user
}

/**
 * Extracts table names referenced in a SQL string via FROM/JOIN clauses.
 * This is a lightweight regex check, not a full SQL parser. It is deliberately
 * conservative: if it can't confidently identify the tables, it rejects the query
 * rather than guessing. For stronger guarantees, swap this for a real SQL AST
 * parser (e.g. `node-sql-parser`) - the whitelist logic below stays the same.
 */
function extractReferencedTables(sql: string): string[] {
  const matches = [...sql.matchAll(/\b(?:from|join)\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)];
  return [...new Set(matches.map((m) => m[1]))];
}

export async function executeSafeQuery(sql: string, tenantId: string): Promise<SafeQueryResult> {
  console.log('[erp-tasks VERSION] v5 (auto-rewrites exact text match to ILIKE, server-side)');
  if (!sql || typeof sql !== 'string') {
    console.log('[chatbot SQL REJECTED]', 'No SQL provided.');
    return { rows: [], error: 'No SQL provided.' };
  }
  if (!SAFE_TENANT_ID.test(tenantId)) {
    // Defensive: this should never happen since tenantId comes from the server session,
    // but if it ever doesn't look right, refuse rather than interpolate it into SQL.
    console.log('[chatbot SQL REJECTED]', 'Invalid tenant context.');
    return { rows: [], error: 'Invalid tenant context.' };
  }

  let trimmed = sql.trim().replace(/;+\s*$/, '');

  // Your actual columns are camelCase (tenantId), but the model sometimes
  // defaults to conventional snake_case (tenant_id) - correct it here rather
  // than rejecting an otherwise-valid query over a naming convention mismatch.
  // (?<!\$) = don't match if immediately preceded by "$" - otherwise this was
  // corrupting our own $TENANT_ID placeholder into $tenantId, which then failed
  // the tenant-scoping check below and silently rejected every valid query.
  trimmed = trimmed.replace(/(?<!\$)\btenant_id\b/gi, 'tenantId');
  // Postgres lowercases unquoted identifiers - "tenantId" unquoted becomes
  // "tenantid" which doesn't exist (real column is camelCase, needs quotes).
  // This was causing "column tenantid does not exist" on every WHERE clause
  // that didn't already quote it.
  trimmed = trimmed.replace(/(?<!")\btenantId\b(?!")/g, '"tenantId"');

  // 1. Must be a single SELECT statement.
  if (!/^select\s/i.test(trimmed)) {
    console.log('[chatbot SQL REJECTED]', 'Only SELECT queries are allowed.');
    return { rows: [], error: 'Only SELECT queries are allowed.' };
  }
  if (trimmed.includes(';')) {
    console.log('[chatbot SQL REJECTED]', 'Multiple statements are not allowed.');
    return { rows: [], error: 'Multiple statements are not allowed.' };
  }
  if (FORBIDDEN_KEYWORDS.test(trimmed)) {
    console.log('[chatbot SQL REJECTED]', 'Query contains a forbidden operation.');
    return { rows: [], error: 'Query contains a forbidden operation.' };
  }

  // 2. Every referenced table must exist in the 254-table whitelist (matched
  //    case-insensitively, since the model often guesses conventional lowercase
  //    or plural names instead of the exact PascalCase Prisma name).
  const referencedTables = extractReferencedTables(trimmed);
  if (referencedTables.length === 0) {
    console.log('[chatbot SQL REJECTED]', 'Could not identify any table in the query.');
    return { rows: [], error: 'Could not identify any table in the query.' };
  }
  let correctedSql = trimmed;
  const resolvedTables: string[] = [];
  for (const table of referencedTables) {
    let realName = LOWERCASE_TO_REAL_TABLE[table.toLowerCase()];
    // Also try singular/plural variants - the model often pluralizes
    // ("admissions") when the real table is singular ("Admission"), or vice versa.
    if (!realName) {
      const lower = table.toLowerCase();
      if (lower.endsWith('s')) {
        realName = LOWERCASE_TO_REAL_TABLE[lower.slice(0, -1)];
      } else {
        realName = LOWERCASE_TO_REAL_TABLE[lower + 's'];
      }
    }
    if (!realName) {
      console.log('[chatbot SQL REJECTED]', `Table "${table}" is not permitted for chatbot access.`);
      return { rows: [], error: `Table "${table}" is not permitted for chatbot access.` };
    }
    resolvedTables.push(realName);
    // ALWAYS quote the table name, even if the model already guessed the exact
    // correct case - Postgres silently lowercases unquoted identifiers, so an
    // unquoted "HotelBooking" looks for "hotelbooking" and fails to find it.
    const pattern = new RegExp(`\\b(from|join)\\s+"?${table}"?(?=\\s|,|\\)|$)`, 'gi');
    correctedSql = correctedSql.replace(pattern, `$1 "${realName}"`);
  }
  trimmed = correctedSql;

  // 3. If any referenced table requires tenant scoping, the query MUST contain
  //    the literal $TENANT_ID placeholder - the model is instructed to write this,
  //    and we substitute the real value here rather than trusting the model to
  //    write the correct tenant id itself.
  const needsTenantScope = resolvedTables.some((t) => TABLE_DICT[t]?.hasTenantId);
  if (needsTenantScope && !trimmed.includes('$TENANT_ID')) {
    console.log('[chatbot SQL REJECTED]', 'Query is missing required tenant scoping and was rejected.');
    return { rows: [], error: 'Query is missing required tenant scoping and was rejected.' };
  }

  // 4. Substitute the real tenant id (already validated as a safe cuid shape above).
  // The model already writes '$TENANT_ID' WITH quotes around it (per the system
  // prompt instructions), so substitute the bare value here - adding quotes again
  // caused a double-quote syntax error ('' around the tenant id).
  const scopedSql = trimmed.replace(/\$TENANT_ID/g, tenantId);

  // Automatically force case-insensitive matching on text comparisons, instead
  // of relying on the model to remember to use ILIKE every time. Rewrites
  // `column = 'value'` into `column ILIKE 'value'`, but SKIPS:
  //   - id/tenantId columns (must stay exact)
  //   - date-looking values (YYYY-MM-DD) - ILIKE breaks on date/timestamp types
  //   - purely numeric values
  const finalSqlWithILike = scopedSql.replace(
    /(\b(?!id\b|tenantId\b)[A-Za-z_][A-Za-z0-9_]*)\s*=\s*'([^']*)'/g,
    (full, column, value) => {
      const looksLikeDate = /^\d{4}-\d{2}-\d{2}/.test(value);
      const looksNumeric = /^-?\d+(\.\d+)?$/.test(value);
      const isIdColumn = /Id$/.test(column);
      if (looksLikeDate || looksNumeric || isIdColumn) return full;
      return `${column} ILIKE '${value}'`;
    }
  );

  // 5. Enforce a row cap regardless of what the model wrote.
  const finalSql = /limit\s+\d+/i.test(finalSqlWithILike) ? finalSqlWithILike : `${finalSqlWithILike} LIMIT 50`;

  // 6. Execute for real.
  try {
    console.log('[chatbot SQL]', finalSql);
    const rows = await prisma.$queryRawUnsafe(finalSql);
    return { rows: rows as any[], sqlExecuted: finalSql };
  } catch (error: any) {
    console.error('[chatbot SQL] execution failed:', error.message);
    console.log('[chatbot SQL REJECTED]', 'Query execution failed. Please rephrase your question.');
    return { rows: [], error: 'Query execution failed. Please rephrase your question.' };
  }
}

/**
 * Generate sales report with insights
 */
export async function generateSalesReport(
  salesData: string,
  period: string
): Promise<{
  totalSales: number;
  topProducts: string[];
  topCustomers: string[];
  insights: string[];
}> {
  const engine = getGroqEngine();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a sales analyst. Based on sales data, generate a report in this JSON format:
{
  "totalSales": number,
  "topProducts": ["string"],
  "topCustomers": ["string"],
  "insights": ["string"]
}

Provide actionable sales insights and trends.`,
    },
    {
      role: 'user',
      content: `Sales data for ${period}:\n${salesData}\n\nGenerate a sales report.`,
    },
  ];

  try {
    const result = await engine.generateCompletion(messages, {
      temperature: 0.4,
      maxTokens: 1200,
    });

    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    let report = {
      totalSales: 0,
      topProducts: [],
      topCustomers: [],
      insights: [],
    };

    if (jsonMatch) {
      try {
        report = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse sales report JSON:', e);
      }
    }

    return report;
  } catch (error: any) {
    throw new Error(`Failed to generate sales report: ${error.message}`);
  }
}