import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const getFilePath = () => path.join(process.cwd(), 'src', 'app', 'api', 'restaurant', 'tables', 'tables.json');

const getTables = () => {
  try {
    const filePath = getFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) { }
  return [];
};

const saveTables = (tables: any) => {
  fs.writeFileSync(getFilePath(), JSON.stringify(tables, null, 2));
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const tables = getTables().filter((t: any) => t.tenantId === tenantId);

    return NextResponse.json(tables);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, capacity, location } = body;
    const tableNumber = body.tableNumber ?? body.number;

    if (!tenantId || !tableNumber || !capacity) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const newTable = {
      id: Math.random().toString(36).substr(2, 9),
      tenantId,
      number: tableNumber,
      capacity,
      location,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString()
    };

    const allTables = getTables();
    allTables.push(newTable);
    saveTables(allTables);

    return NextResponse.json(newTable, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, tables: updatedTables } = body;

    if (!tenantId || !Array.isArray(updatedTables)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const allTables = getTables();

    let updateCount = 0;
    const newAllTables = allTables.map((t: any) => {
      if (t.tenantId !== tenantId) return t;

      const matchingUpdate = updatedTables.find((u: any) => u.id === t.id);
      if (matchingUpdate) {
        updateCount++;
        return { ...t, ...matchingUpdate };
      }
      return t;
    });

    saveTables(newAllTables);

    return NextResponse.json({ success: true, count: updateCount }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const id = searchParams.get('id');

    if (!tenantId || !id) {
      return NextResponse.json({ error: 'Tenant ID and Table ID required' }, { status: 400 });
    }

    const allTables = getTables();
    const newAllTables = allTables.filter((t: any) => !(t.id === id && t.tenantId === tenantId));
    saveTables(newAllTables);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
