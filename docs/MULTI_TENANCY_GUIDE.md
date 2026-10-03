# Multi-Tenancy & Data Isolation Architecture

This document explains how the ERP system ensures complete data isolation between tenants (companies) and how the frontend authenticates and identifies the correct tenant.

## 1. Data Isolation Strategy (The "Shared Database, Separate Schema" Approach)

We use a **Row-Level Security** approach enforced at the application layer.

### The Tenant ID
Every model in our database that belongs to a specific company **MUST** have a `tenantId` field. This is the foreign key that links data to a specific `Tenant`.

**Example Schema (`prisma/schema.prisma`):**
```prisma
model Property {
  id          String   @id @default(cuid())
  title       String
  // ... other fields

  tenantId    String   // <--- CRITICAL: Links this record to ONE tenant
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}
```

### Enforcing Isolation
We never query "all properties". We always query "properties for THIS tenant".

**Incorrect (Data Leak):**
```typescript
// ❌ DANGEROUS: Returns properties from ALL companies
const properties = await prisma.property.findMany();
```

**Correct (Isolated):**
```typescript
// ✅ SAFE: Returns properties only for the logged-in user's tenant
const properties = await prisma.property.findMany({
  where: {
    tenantId: session.user.tenantId
  }
});
```

---

## 2. Authentication & Tenant Resolution Flow

How does the system know that `user@companyA.com` is logging into Company A?

### Step A: Subdomain Detection (Middleware)
When a user visits `company-a.erp.slict.lk`:

1.  **Middleware (`middleware.ts`)** intercepts the request.
2.  Parses the host: `company-a.erp.slict.lk`.
3.  Identifies the subdomain: `company-a`.
4.  Sets a header `x-tenant-subdomain: company-a` for the backend to use.

### Step B: Database Lookup (`lib/tenant.ts`)
The backend uses the subdomain to find the Tenant ID.
```sql
SELECT * FROM Tenant WHERE subdomain = 'company-a';
-- Result: { id: "tenant_123", name: "Company A", ... }
```

### Step C: User Login & Session (`lib/auth-options.ts`)
When the user logs in:
1.  They enter email/password.
2.  The system finds the user in the database.
3.  **Validation**: The system checks if the user belongs to the derived Tenant (`tenant_123`).
    *   *Security Check*: If a user from Company B tries to log into Company A's subdomain, they are blocked (unless they are a super-admin).
4.  **Session Creation**: A JWT (JSON Web Token) is minted containing the `tenantId`.

**Session Token Payload:**
```json
{
  "id": "user_456",
  "email": "john@companya.com",
  "role": "ADMIN",
  "tenantId": "tenant_123"  // <--- This travels with every request
}
```

---

## 3. Frontend Awareness

How does the React/Next.js frontend know which tenant is active?

### Server Components
Server components read the headers or the session directly.
```typescript
// src/app/page.tsx
const session = await getServerSession(authOptions);
const currentTenantId = session?.user?.tenantId;
```

### Client Components (Context)
We use a **SessionProvider** to make this data available to any component.

```tsx
// Any Component
import { useSession } from "next-auth/react";

export function DashboardHeader() {
  const { data: session } = useSession();
  
  // Access tenant details instantly
  const companyName = session?.user?.tenant;
  
  return <h1>Welcome to {companyName}</h1>;
}
```

## Summary Checklist for Developers

- [ ] **Always** include `where: { tenantId: ... }` in Prisma queries.
- [ ] **Never** make `tenantId` optional in your Prisma schema for company-specific data.
- [ ] **Always** use `getSession()` or `useSession()` to get the current valid `tenantId`.
- [ ] **Do not** trust the subdomain alone for data operations; trust the secure session `tenantId`.
