import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { tryCatch } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Skip authentication during build - return empty results
    let user;
    try {
      user = await getCurrentUser();
    } catch (error) {
      // During build or when no session, return empty results
      return NextResponse.json({
        query: '',
        count: 0,
        results: [],
        categories: {
          customers: 0,
          orders: 0,
          products: 0,
          invoices: 0,
          employees: 0,
          projects: 0,
        },
      });
    }
    if (!user?.tenantId) {
      return NextResponse.json(
        { 
          query: '',
          count: 0,
          results: [],
          categories: {
            customers: 0,
            orders: 0,
            products: 0,
            invoices: 0,
            employees: 0,
            projects: 0,
          },
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        query: query || '',
        count: 0,
        results: [],
        message: 'Query must be at least 2 characters',
        categories: {
          customers: 0,
          orders: 0,
          products: 0,
          invoices: 0,
          employees: 0,
          projects: 0,
        },
      });
    }

    const searchTerm = query.trim();
    const tenantId = user.tenantId;

    // Search across multiple modules
    const [customers, orders, products, invoices, employees, projects] = await Promise.all([
      // Customers
      prisma.customer.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
        },
        take: 5,
      }),
      // Sales Orders
      prisma.salesOrder.findMany({
        where: {
          tenantId,
          OR: [
            { number: { contains: searchTerm, mode: 'insensitive' } },
            { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        },
        include: {
          customer: { select: { name: true } },
        },
        take: 5,
      }),
      // Products
      prisma.product.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { sku: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          sku: true,
          salePrice: true,
        },
        take: 5,
      }),
      // Invoices
      prisma.invoice.findMany({
        where: {
          tenantId,
          OR: [
            { number: { contains: searchTerm, mode: 'insensitive' } },
            { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          number: true,
          customer: { select: { name: true } },
          total: true,
          status: true,
        },
        take: 5,
      }),
      // Employees
      prisma.employee.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { employeeId: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        take: 5,
      }),
      // Projects
      prisma.project.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: 5,
      }),
    ]);

    const results = {
      customers: customers.map(c => ({
        type: 'customer',
        id: c.id,
        title: c.name,
        subtitle: c.email,
        url: `/sales/customers/${c.id}`,
        icon: 'Users',
      })),
      orders: orders.map(o => ({
        type: 'order',
        id: o.id,
        title: o.number,
        subtitle: `Customer: ${o.customer?.name || 'N/A'} - $${o.total?.toFixed(2) || '0.00'}`,
        url: `/sales/orders/${o.id}`,
        icon: 'ShoppingCart',
      })),
      products: products.map(p => ({
        type: 'product',
        id: p.id,
        title: p.name,
        subtitle: `SKU: ${p.sku} - $${p.salePrice?.toFixed(2) || '0.00'}`,
        url: `/inventory/products/${p.id}`,
        icon: 'Package',
      })),
      invoices: invoices.map(i => ({
        type: 'invoice',
        id: i.id,
        title: i.number,
        subtitle: `Customer: ${i.customer?.name || 'N/A'} - $${i.total?.toFixed(2) || '0.00'}`,
        url: `/accounting/invoices/${i.id}`,
        icon: 'FileText',
      })),
      employees: employees.map(e => ({
        type: 'employee',
        id: e.id,
        title: `${e.firstName || ''} ${e.lastName || ''}`,
        subtitle: e.email || e.employeeId,
        url: `/hr/employees/${e.id}`,
        icon: 'User',
      })),
      projects: projects.map(p => ({
        type: 'project',
        id: p.id,
        title: p.name,
        subtitle: p.status,
        url: `/projects/${p.id}`,
        icon: 'Briefcase',
      })),
    };

    const allResults = [
      ...results.customers,
      ...results.orders,
      ...results.products,
      ...results.invoices,
      ...results.employees,
      ...results.projects,
    ].slice(0, 20); // Limit total results

    return NextResponse.json({
      query: searchTerm,
      count: allResults.length,
      results: allResults,
      categories: {
        customers: results.customers.length,
        orders: results.orders.length,
        products: results.products.length,
        invoices: results.invoices.length,
        employees: results.employees.length,
        projects: results.projects.length,
      },
    });
  } catch (error) {
    // Handle errors gracefully during build time
    console.error('Search error:', error);
    return NextResponse.json({
      query: '',
      count: 0,
      results: [],
      categories: {
        customers: 0,
        orders: 0,
        products: 0,
        invoices: 0,
        employees: 0,
        projects: 0,
      },
      error: 'Search temporarily unavailable',
    }, { status: 200 });
  }
}

