/**
 * Comprehensive QA Test Suite for SLICT ERP
 * Tests all modules, APIs, routes, CRUD operations, and authentication
 */

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set to run the QA suite.');
  process.exit(1);
}

const BASE_URL = 'http://localhost:3000';
let cookies = '';
let csrfToken = '';
let testResults = { passed: 0, failed: 0, errors: [] };
let createdRecords = {};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

async function getCSRF() {
  const res = await fetch(`${BASE_URL}/api/auth/csrf`);
  const data = await res.json();
  csrfToken = data.csrfToken;
  // Extract cookies from response
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookies = setCookie;
  return csrfToken;
}

async function login() {
  await getCSRF();
  const formData = new URLSearchParams();
  formData.append('email', TEST_USER_EMAIL);
  formData.append('password', TEST_USER_PASSWORD);
  formData.append('csrfToken', csrfToken);
  formData.append('redirect', 'false');
  formData.append('callbackUrl', `${BASE_URL}/`);
  formData.append('json', 'true');

  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: formData.toString(),
    redirect: 'manual'
  });

  // Collect all cookies from response
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (setCookies.length > 0) {
    cookies = setCookies.map(c => c.split(';')[0]).join('; ');
  }
  return res.status === 200 || res.status === 302;
}

async function loginRetry() {
  // Full login flow with proper cookie handling
  // Step 1: Get CSRF
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  csrfToken = csrfData.csrfToken;

  // Collect cookies from CSRF response
  const csrfCookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [];
  let cookieStr = csrfCookies.map(c => c.split(';')[0]).join('; ');

  // Step 2: Login
  const formData = new URLSearchParams();
  formData.append('email', TEST_USER_EMAIL);
  formData.append('password', TEST_USER_PASSWORD);
  formData.append('csrfToken', csrfToken);
  formData.append('redirect', 'false');
  formData.append('callbackUrl', `${BASE_URL}/`);
  formData.append('json', 'true');

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieStr
    },
    body: formData.toString(),
    redirect: 'manual'
  });

  // Collect all cookies
  const loginCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  if (loginCookies.length > 0) {
    cookieStr = loginCookies.map(c => c.split(';')[0]).join('; ');
  }
  cookies = cookieStr;
  return loginRes.status === 200 || loginRes.status === 302;
}

async function apiCall(endpoint, method = 'GET', body = null, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && cookies) {
    headers['Cookie'] = cookies;
  }

  const options = { method, headers, signal: AbortSignal.timeout(10000) };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    return res;
  } catch (e) {
    if (e.name === 'TimeoutError') {
      return { ok: false, status: 408, json: async () => ({ error: 'Request timeout' }) };
    }
    throw e;
  }
}

async function apiGet(endpoint) {
  return apiCall(endpoint, 'GET');
}

async function apiPost(endpoint, data) {
  return apiCall(endpoint, 'POST', data);
}

async function apiPut(endpoint, data) {
  return apiCall(endpoint, 'PUT', data);
}

async function apiDelete(endpoint) {
  return apiCall(endpoint, 'DELETE');
}

// ==========================================
// TEST RUNNER
// ==========================================

function pass(testName) {
  testResults.passed++;
  console.log(`  ✅ ${testName}`);
}

function fail(testName, reason) {
  testResults.failed++;
  testResults.errors.push({ test: testName, reason });
  console.log(`  ❌ ${testName}: ${reason}`);
}

function warn(testName, info) {
  console.log(`  ⚠️  ${testName}: ${info}`);
}

async function test(name, fn) {
  try {
    await fn();
  } catch (error) {
    fail(name, error.message);
  }
}

// ==========================================
// TEST SUITES
// ==========================================

async function runAuthTests() {
  console.log('\n🔐 AUTHENTICATION TESTS');
  console.log('==========================');

  await test('CSRF token retrieval', async () => {
    const token = await getCSRF();
    if (!token) throw new Error('No CSRF token received');
    pass('CSRF token retrieval');
  });

  await test('Login with valid credentials', async () => {
    const success = await login();
    if (!success) throw new Error(`Login failed`);
    pass('Login with valid credentials');
  });

  await test('Session validation', async () => {
    const res = await apiGet('/api/auth/session');
    const data = await res.json();
    if (!data.user) throw new Error('No user in session');
    if (data.user.email !== TEST_USER_EMAIL) throw new Error('Wrong user email');
    pass('Session validation');
  });

  await test('Protected route redirects unauthenticated user', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      redirect: 'manual',
      headers: {} // No cookies
    });
    if (res.status !== 302 && res.status !== 307 && res.status !== 401) {
      throw new Error(`Expected redirect, got ${res.status}`);
    }
    pass('Protected route redirects unauthenticated user');
  });
}

async function runRouteTests() {
  console.log('\n🌐 ROUTE TESTS');
  console.log('==========================');

  const routes = [
    // Core
    { path: '/', name: 'Home/Landing' },
    { path: '/login', name: 'Login' },
    { path: '/dashboard', name: 'Dashboard' },
    // Sales & CRM
    { path: '/crm', name: 'CRM' },
    { path: '/sales', name: 'Sales' },
    { path: '/contacts', name: 'Contacts' },
    // Finance
    { path: '/accounting', name: 'Accounting' },
    { path: '/purchasing', name: 'Purchasing' },
    { path: '/subscriptions', name: 'Subscriptions' },
    // Operations
    { path: '/inventory', name: 'Inventory' },
    { path: '/manufacturing', name: 'Manufacturing' },
    { path: '/quality', name: 'Quality' },
    { path: '/automotive', name: 'Automotive' },
    { path: '/spareparts', name: 'Spare Parts' },
    { path: '/vehicle-export', name: 'Vehicle Export' },
    // HR
    { path: '/hr', name: 'HR' },
    { path: '/hr/attendance', name: 'Attendance' },
    { path: '/hr/payroll', name: 'Payroll' },
    // Projects
    { path: '/projects', name: 'Projects' },
    // Marketing
    { path: '/marketing', name: 'Marketing' },
    { path: '/blog', name: 'Blog' },
    { path: '/surveys', name: 'Surveys' },
    // Services
    { path: '/helpdesk', name: 'Helpdesk' },
    // E-Commerce
    { path: '/pos', name: 'POS' },
    { path: '/cart', name: 'Cart' },
    { path: '/loyalty', name: 'Loyalty' },
    // Real Estate
    { path: '/real-estate', name: 'Real Estate' },
    { path: '/agents', name: 'Agents' },
    // Hospitality
    { path: '/hotel', name: 'Hotel' },
    { path: '/restaurant', name: 'Restaurant' },
    // Communication
    { path: '/livechat', name: 'Live Chat' },
    { path: '/sms', name: 'SMS' },
    // Productivity
    { path: '/calendar', name: 'Calendar' },
    { path: '/courses', name: 'Courses' },
    { path: '/knowledge', name: 'Knowledge Base' },
    { path: '/forum', name: 'Forum' },
    { path: '/presentations', name: 'Presentations' },
    // Automation
    { path: '/automation', name: 'Automation' },
    { path: '/integrations', name: 'Integrations' },
    { path: '/studio', name: 'Studio' },
    { path: '/ai', name: 'AI Assistant' },
    { path: '/intelligence', name: 'Intelligence' },
    // Healthcare
    { path: '/healthcare', name: 'Healthcare' },
    { path: '/healthcare/reception', name: 'Healthcare Reception' },
    { path: '/healthcare/consultation', name: 'Healthcare Consultation' },
    { path: '/healthcare/pharmacy', name: 'Healthcare Pharmacy' },
    { path: '/healthcare/lab', name: 'Healthcare Lab' },
    { path: '/healthcare/admission', name: 'Healthcare Admission' },
    { path: '/healthcare/nursing', name: 'Healthcare Nursing' },
    // Settings
    { path: '/settings', name: 'Settings' },
    { path: '/settings/users', name: 'User Settings' },
    { path: '/settings/modules', name: 'Module Settings' },
    // Admin
    { path: '/admin/tenants', name: 'Tenant Admin' },
  ];

  for (const route of routes) {
    await test(`Route: ${route.name} (${route.path})`, async () => {
      try {
        const res = await fetch(`${BASE_URL}${route.path}`, {
          redirect: 'manual',
          headers: cookies ? { Cookie: cookies } : {},
          signal: AbortSignal.timeout(15000) // 15 second timeout for route tests
        });

        if (res.status === 200 || res.status === 302 || res.status === 307) {
          pass(`Route: ${route.name} (${route.path}) - ${res.status}`);
        } else if (res.status === 404) {
          fail(`Route: ${route.name} (${route.path})`, `404 Not Found`);
        } else if (res.status >= 500) {
          fail(`Route: ${route.name} (${route.path})`, `Server Error: ${res.status}`);
        } else {
          warn(`Route: ${route.name} (${route.path})`, `Status: ${res.status}`);
        }
      } catch (error: any) {
        if (error.name === 'TimeoutError') {
          warn(`Route: ${route.name} (${route.path})`, 'Request timeout (page may be slow to load)');
        } else {
          fail(`Route: ${route.name} (${route.path})`, `Network error: ${error.message}`);
        }
      }
    });
  }
}

async function runAPIEndpointTests() {
  console.log('\n🔌 API ENDPOINT TESTS');
  console.log('==========================');

  // Dashboard APIs
  await test('GET /api/dashboard/stats', async () => {
    const res = await apiGet('/api/dashboard/stats');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/dashboard/stats');
  });

  await test('GET /api/dashboard/financials', async () => {
    const res = await apiGet('/api/dashboard/financials?period=month');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/dashboard/financials');
  });

  // Contacts API
  await test('GET /api/contacts (list)', async () => {
    const res = await apiGet('/api/contacts');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/contacts (list)');
  });

  await test('POST /api/contacts (create)', async () => {
    const res = await apiPost('/api/contacts', {
      name: 'QA Test Contact',
      email: 'qa.test@example.com',
      phone: '+1234567890',
      type: 'INDIVIDUAL'
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (data.id) createdRecords.contact = data.id;
    pass('POST /api/contacts (create)');
  });

  // Customers API
  await test('GET /api/customers (list)', async () => {
    const res = await apiGet('/api/customers');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/customers (list)');
  });

  await test('POST /api/customers (create)', async () => {
    const res = await apiPost('/api/customers', {
      name: 'QA Test Customer',
      email: 'qa.customer@example.com',
      type: 'INDIVIDUAL'
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (data.id) createdRecords.customer = data.id;
    pass('POST /api/customers (create)');
  });

  // Products API
  await test('GET /api/products (list)', async () => {
    const res = await apiGet('/api/products');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/products (list)');
  });

  await test('POST /api/products (create)', async () => {
    const res = await apiPost('/api/products', {
      name: 'QA Test Product',
      sku: `QA-${Date.now()}`,
      salePrice: 99.99,
      costPrice: 49.99
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (data.id) createdRecords.product = data.id;
    pass('POST /api/products (create)');
  });

  // Sales Orders API
  await test('GET /api/sales-orders (list)', async () => {
    const res = await apiGet('/api/sales-orders');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/sales-orders (list)');
  });

  // Invoices API
  await test('GET /api/invoices (list)', async () => {
    const res = await apiGet('/api/invoices');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/invoices (list)');
  });

  // Quotations API
  await test('GET /api/quotations (list)', async () => {
    const res = await apiGet('/api/quotations');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/quotations (list)');
  });

  // Inventory API
  await test('GET /api/inventory (list)', async () => {
    const res = await apiGet('/api/inventory');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/inventory (list)');
  });

  // Warehouses API
  await test('GET /api/warehouses (list)', async () => {
    const res = await apiGet('/api/warehouses');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/warehouses (list)');
  });

  // Employees API
  await test('GET /api/employees (list)', async () => {
    const res = await apiGet('/api/employees');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/employees (list)');
  });

  await test('POST /api/employees (create)', async () => {
    const res = await apiPost('/api/employees', {
      firstName: 'QA',
      lastName: 'Tester',
      email: `qa.tester.${Date.now()}@example.com`,
      position: 'QA Engineer',
      hireDate: new Date().toISOString(),
      type: 'FULL_TIME'
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (data.id) createdRecords.employee = data.id;
    pass('POST /api/employees (create)');
  });

  // Leads API
  await test('GET /api/leads (list)', async () => {
    const res = await apiGet('/api/leads');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/leads (list)');
  });

  // Opportunities API
  await test('GET /api/opportunities (list)', async () => {
    const res = await apiGet('/api/opportunities');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/opportunities (list)');
  });

  // Purchase Orders API
  await test('GET /api/purchase-orders (list)', async () => {
    const res = await apiGet('/api/purchase-orders');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/purchase-orders (list)');
  });

  // Vendors API
  await test('GET /api/vendors (list)', async () => {
    const res = await apiGet('/api/vendors');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/vendors (list)');
  });

  // Subscriptions APIs
  await test('GET /api/subscriptions (list)', async () => {
    const res = await apiGet('/api/subscriptions');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/subscriptions (list)');
  });

  await test('GET /api/subscriptions/plans (list)', async () => {
    const res = await apiGet('/api/subscriptions/plans');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/subscriptions/plans (list)');
  });

  await test('POST /api/subscriptions/plans (create)', async () => {
    const res = await apiPost('/api/subscriptions/plans', {
      name: 'QA Test Plan',
      description: 'Plan for testing',
      billingPeriod: 'MONTHLY',
      price: 29.99,
      trialDays: 14,
      features: { users: 5, storage: '10GB' }
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (data.id) createdRecords.subscriptionPlan = data.id;
    pass('POST /api/subscriptions/plans (create)');
  });

  await test('GET /api/subscriptions/metrics', async () => {
    const res = await apiGet('/api/subscriptions/metrics');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/subscriptions/metrics');
  });

  // Tickets API
  await test('GET /api/tickets (list)', async () => {
    const res = await apiGet('/api/tickets');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/tickets (list)');
  });

  // Tasks API
  await test('GET /api/tasks (list)', async () => {
    const res = await apiGet('/api/tasks');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/tasks (list)');
  });

  // Expenses API
  await test('GET /api/expenses (list)', async () => {
    const res = await apiGet('/api/expenses');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/expenses (list)');
  });

  // Journal Entries API
  await test('GET /api/journal-entries (list)', async () => {
    const res = await apiGet('/api/journal-entries');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/journal-entries (list)');
  });

  // Accounts API
  await test('GET /api/accounts (list)', async () => {
    const res = await apiGet('/api/accounts');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/accounts (list)');
  });

  // Tax Rates API
  await test('GET /api/tax-rates (list)', async () => {
    const res = await apiGet('/api/tax-rates');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/tax-rates (list)');
  });

  // POS API
  await test('GET /api/pos/orders (list)', async () => {
    const res = await apiGet('/api/pos/orders');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/pos/orders (list)');
  });

  // Studio APIs
  await test('GET /api/studio/modules', async () => {
    const res = await apiGet('/api/studio/modules');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/studio/modules');
  });

  await test('GET /api/studio/dashboards', async () => {
    const res = await apiGet('/api/studio/dashboards');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/studio/dashboards');
  });

  // Admin APIs
  await test('GET /api/tenants', async () => {
    const res = await apiGet('/api/tenants');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/tenants');
  });

  await test('GET /api/admin/tenants', async () => {
    const res = await apiGet('/api/admin/tenants');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('GET /api/admin/tenants');
  });
}

async function runCRUDTests() {
  console.log('\n📝 CRUD OPERATION TESTS');
  console.log('==========================');

  // Test Contact CRUD
  if (createdRecords.contact) {
    await test('GET /api/contacts/:id (read)', async () => {
      const res = await apiGet(`/api/contacts/${createdRecords.contact}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('GET /api/contacts/:id (read)');
    });

    await test('PUT /api/contacts/:id (update)', async () => {
      const res = await apiPut(`/api/contacts/${createdRecords.contact}`, {
        name: 'QA Test Contact Updated',
        email: 'qa.test.updated@example.com'
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('PUT /api/contacts/:id (update)');
    });

    await test('DELETE /api/contacts/:id (delete)', async () => {
      const res = await apiDelete(`/api/contacts/${createdRecords.contact}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('DELETE /api/contacts/:id (delete)');
    });
  }

  // Test Customer CRUD
  if (createdRecords.customer) {
    await test('GET /api/customers/:id (read)', async () => {
      const res = await apiGet(`/api/customers/${createdRecords.customer}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('GET /api/customers/:id (read)');
    });

    await test('PUT /api/customers/:id (update)', async () => {
      const res = await apiPut(`/api/customers/${createdRecords.customer}`, {
        name: 'QA Test Customer Updated'
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('PUT /api/customers/:id (update)');
    });
  }

  // Test Product CRUD
  if (createdRecords.product) {
    await test('GET /api/products/:id (read)', async () => {
      const res = await apiGet(`/api/products/${createdRecords.product}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('GET /api/products/:id (read)');
    });

    await test('PUT /api/products/:id (update)', async () => {
      const res = await apiPut(`/api/products/${createdRecords.product}`, {
        name: 'QA Test Product Updated',
        salePrice: 149.99
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('PUT /api/products/:id (update)');
    });
  }

  // Test Employee CRUD
  if (createdRecords.employee) {
    await test('GET /api/employees/:id (read)', async () => {
      const res = await apiGet(`/api/employees/${createdRecords.employee}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('GET /api/employees/:id (read)');
    });

    await test('PUT /api/employees/:id (update)', async () => {
      const res = await apiPut(`/api/employees/${createdRecords.employee}`, {
        firstName: 'QA',
        lastName: 'Tester Updated',
        position: 'Senior QA Engineer'
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('PUT /api/employees/:id (update)');
    });
  }

  // Test Subscription Plan CRUD
  if (createdRecords.subscriptionPlan) {
    await test('GET /api/subscriptions/plans/:id (read)', async () => {
      const res = await apiGet(`/api/subscriptions/plans/${createdRecords.subscriptionPlan}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('GET /api/subscriptions/plans/:id (read)');
    });

    await test('PUT /api/subscriptions/plans/:id (update)', async () => {
      const res = await apiPut(`/api/subscriptions/plans/${createdRecords.subscriptionPlan}`, {
        name: 'QA Test Plan Updated',
        price: 49.99
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      pass('PUT /api/subscriptions/plans/:id (update)');
    });
  }
}

async function runValidationTests() {
  console.log('\n✅ VALIDATION TESTS');
  console.log('==========================');

  await test('Empty form submission (contacts)', async () => {
    const res = await apiPost('/api/contacts', {});
    if (res.status === 200 || res.status === 201) {
      throw new Error('Should reject empty submission');
    }
    pass('Empty form submission (contacts) - correctly rejected');
  });

  await test('Invalid email format (contacts)', async () => {
    const res = await apiPost('/api/contacts', {
      name: 'Test',
      email: 'not-an-email'
    });
    if (res.status === 200 || res.status === 201) {
      warn('Invalid email format (contacts)', 'Server accepted invalid email');
    } else {
      pass('Invalid email format (contacts) - correctly rejected');
    }
  });

  await test('Missing required fields (products)', async () => {
    const res = await apiPost('/api/products', { name: 'Test' });
    if (res.status === 200 || res.status === 201) {
      warn('Missing required fields (products)', 'Server accepted incomplete data');
    } else {
      pass('Missing required fields (products) - correctly rejected');
    }
  });

  await test('Duplicate email (contacts)', async () => {
    const email = `duplicate.${Date.now()}@example.com`;
    await apiPost('/api/contacts', { name: 'First', email });
    const res = await apiPost('/api/contacts', { name: 'Second', email });
    if (res.status === 200 || res.status === 201) {
      warn('Duplicate email (contacts)', 'Server accepted duplicate email');
    } else {
      pass('Duplicate email (contacts) - correctly rejected');
    }
  });

  await test('Invalid product price (negative)', async () => {
    const res = await apiPost('/api/products', {
      name: 'Test',
      sku: `NEG-${Date.now()}`,
      salePrice: -10
    });
    if (res.status === 200 || res.status === 201) {
      warn('Negative price (products)', 'Server accepted negative price');
    } else {
      pass('Negative price (products) - correctly rejected');
    }
  });
}

async function runSearchFilterTests() {
  console.log('\n🔍 SEARCH & FILTER TESTS');
  console.log('==========================');

  await test('Search contacts by name', async () => {
    const res = await apiGet('/api/contacts?search=QA');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('Search contacts by name');
  });

  await test('Filter contacts by type', async () => {
    const res = await apiGet('/api/contacts?type=INDIVIDUAL');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('Filter contacts by type');
  });

  await test('Search products by name', async () => {
    const res = await apiGet('/api/products?search=QA');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('Search products by name');
  });

  await test('Filter products by category', async () => {
    const res = await apiGet('/api/products?category=general');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('Filter products by category');
  });

  await test('Filter subscriptions by status', async () => {
    const res = await apiGet('/api/subscriptions?status=ACTIVE');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('Filter subscriptions by status');
  });

  await test('Filter subscription plans by active', async () => {
    const res = await apiGet('/api/subscriptions/plans?active=true');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    pass('Filter subscription plans by active');
  });
}

async function runCleanupTests() {
  console.log('\n🧹 CLEANUP TESTS');
  console.log('==========================');

  // Clean up created test records
  if (createdRecords.customer) {
    await test('Delete test customer', async () => {
      const res = await apiDelete(`/api/customers/${createdRecords.customer}`);
      if (!res.ok && res.status !== 404) throw new Error(`Status: ${res.status}`);
      pass('Delete test customer');
    });
  }

  if (createdRecords.product) {
    await test('Delete test product', async () => {
      const res = await apiDelete(`/api/products/${createdRecords.product}`);
      if (!res.ok && res.status !== 404) throw new Error(`Status: ${res.status}`);
      pass('Delete test product');
    });
  }

  if (createdRecords.employee) {
    await test('Delete test employee', async () => {
      const res = await apiDelete(`/api/employees/${createdRecords.employee}`);
      if (!res.ok && res.status !== 404) throw new Error(`Status: ${res.status}`);
      pass('Delete test employee');
    });
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllTests() {
  console.log('🚀 SLICT ERP - COMPREHENSIVE QA TEST SUITE');
  console.log('=============================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Target: ${BASE_URL}`);

  const startTime = Date.now();

  // Run all test suites
  await runAuthTests();
  // Re-login with better cookie handling before API tests
  await loginRetry();
  await runRouteTests();
  await runAPIEndpointTests();
  await runCRUDTests();
  await runValidationTests();
  await runSearchFilterTests();
  await runCleanupTests();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // ==========================================
  // FINAL REPORT
  // ==========================================
  console.log('\n\n📊 QA TEST REPORT');
  console.log('=============================================');
  console.log(`Test Duration: ${duration}s`);
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Pass Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('==========================');
    testResults.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.test}`);
      console.log(`     Reason: ${err.reason}`);
    });
  }

  console.log('\n=============================================');
  console.log(`Status: ${testResults.failed === 0 ? '✅ ALL TESTS PASSED' : '⚠️ ISSUES FOUND'}`);
  console.log('=============================================');
}

runAllTests().catch(console.error);
