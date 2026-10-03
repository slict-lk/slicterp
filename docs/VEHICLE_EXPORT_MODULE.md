# Vehicle Export Module - Complete Documentation

> **Last Updated:** 2026-01-29  
> **Status:** Phase 5D Complete  
> **Next Phase:** Phase 5C (Workflow Triggers)

---

# Part 1: Business Overview (Non-Technical)

## What Is This Module?

Think of this module as the **digital backbone for a Japanese used car export business** (like Kobe Motor). It manages the complete journey from receiving a customer inquiry to delivering the car at a foreign port.

### The Customer Journey (Simplified)

```
🧑 Customer submits inquiry → 💰 Deposits money → 🚗 We bid at auction
     ↓
🏆 Win auction → 🔧 Yard prepares car → 📦 Ship to destination
     ↓
📄 Send documents → ✅ Customer clears customs → 🎉 Done!
```

### Key Concepts (Explained Simply)

| Business Term | What It Means | In This System |
|---------------|---------------|----------------|
| **Bid Request** | Customer says "I want a Toyota Land Cruiser under $20,000" | `ExportBid` with status PENDING |
| **Proxy Bidding** | We bid at auction on customer's behalf | Staff changes bid status to ACTIVE, then WON/LOST |
| **CIF Price** | Total cost including shipping & insurance | Auto-calculated invoice total |
| **Yard Job** | Repairs, cleaning, inspection before shipping | `YardJob` with labor cost + materials |
| **BL (Bill of Lading)** | Shipping document proving ownership | Tracked in `DocumentDispatch` |
| **JAAI Certificate** | Japanese export inspection certificate | Status tracked on vehicle |

### Who Uses What?

| Role | What They Do | Pages They Use |
|------|--------------|----------------|
| **Sales Staff** | Process bid requests, assign vehicles | `/vehicle-export/bids` |
| **Auctioneer** | Bid at auctions, record results | `/vehicle-export/auction` |
| **Yard Manager** | Track repairs, add parts costs | `/vehicle-export/yard` |
| **Finance** | Verify deposits, manage payments | `/vehicle-export/finance` |
| **Logistics** | Manage shipments, track documents | `/vehicle-export/shipments` |
| **Customer (External)** | Browse cars, submit bids | External storefront |

### Money Flow

```
Customer Deposit → Wallet Balance → Deducted on Purchase → Invoice Generated
                                                              ↓
                                                    Remaining balance paid
                                                              ↓
                                                    Documents dispatched
```

---

# Part 2: Technical Documentation (For AI Agents)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VEHICLE EXPORT MODULE                     │
├─────────────────────────────────────────────────────────────────┤
│  FRONTEND (Next.js App Router)                                  │
│  └── /vehicle-export/*                                          │
│      ├── /bids          - Bid management                        │
│      ├── /auction       - Auctioneer dashboard                  │
│      ├── /inventory     - Vehicle list & details                │
│      ├── /yard          - Yard job management                   │
│      ├── /shipments     - Shipment tracking                     │
│      ├── /customers     - Customer management                   │
│      ├── /finance       - Deposit verification                  │
│      └── /storefront    - Public site configuration             │
├─────────────────────────────────────────────────────────────────┤
│  INTERNAL API (/api/vehicle-export/*)                           │
│  └── Protected by NextAuth session                              │
│      ├── /bids, /bids/[id]                                      │
│      ├── /vehicles, /vehicles/[id], /vehicles/[id]/invoice      │
│      ├── /yard-jobs, /yard-jobs/[id], /yard-jobs/[id]/materials │
│      ├── /shipments                                             │
│      ├── /customers                                             │
│      ├── /wallet/[customerId], /wallet/transactions             │
│      ├── /documents                                             │
│      └── /config                                                │
├─────────────────────────────────────────────────────────────────┤
│  PUBLIC API (/api/public/export/*)                              │
│  └── Protected by API Key (X-API-Key header)                    │
│      ├── /config        - Store configuration                   │
│      ├── /vehicles      - Published vehicle listings            │
│      └── /bids          - Bid submission                        │
└─────────────────────────────────────────────────────────────────┘
```

## Database Models (Prisma Schema)

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `ExportCustomer` | Customer profiles | name, email, country, wallet relation |
| `ExportVehicle` | Vehicle inventory | stockNumber, chassisNumber, status, prices |
| `ExportBid` | Customer bid requests | maxBudget, proxyBidStatus, vehicleId |
| `ExportShipment` | Shipping containers | vesselName, etd, eta, status |
| `YardJob` | Repair/prep work | type, status, cost, materials |

### Phase 5 Models (Wallet, Docs, Invoice)

| Model | Purpose | Relations |
|-------|---------|-----------|
| `ExportWallet` | Customer balance | → ExportCustomer (1:1) |
| `ExportWalletTransaction` | Deposits/withdrawals | → ExportWallet |
| `DocumentDispatch` | Courier tracking | → ExportVehicle (1:1) |
| `YardMaterial` | Parts used in repairs | → YardJob |
| `ExportInvoice` | CIF invoices | → ExportVehicle (1:1) |
| `ExportInvoiceItem` | Invoice line items | → ExportInvoice |

### Enums

```prisma
enum ExportStatus {
  DRAFT, PENDING_AUCTION, WON, IN_YARD, READY_TO_SHIP, 
  SHIPPED, ARRIVED, DELIVERED, CANCELLED
}

enum ExportBidStatus {
  PENDING, APPROVED, REJECTED, LINKED
}

enum ProxyBidStatus {
  PENDING, ACTIVE, WON, LOST, OUTBID
}

enum ExportShipmentStatus {
  BOOKING, IN_TRANSIT, ARRIVED, CUSTOMS, DELIVERED
}
```

## Implementation Status

### ✅ Completed Phases

#### Phase 1: Core Infrastructure
- [x] Prisma schema for all export models
- [x] Basic CRUD APIs for vehicles, bids, customers, shipments
- [x] Dashboard with statistics
- [x] Sidebar navigation

#### Phase 2: Vehicle Management
- [x] Vehicle list with filtering & search
- [x] Vehicle detail page with tabs
- [x] Photo gallery support
- [x] Status workflow management

#### Phase 3: Bid & Auction Flow
- [x] Bid submission (internal + public API)
- [x] Bid approval workflow
- [x] Vehicle-bid linking
- [x] Auctioneer dashboard for recording results

#### Phase 4: Storefront
- [x] Store configuration UI (`/storefront`)
- [x] Public API for vehicle listings
- [x] Public bid submission API
- [x] API key authentication

#### Phase 5A: Schema Additions
- [x] ExportWallet model
- [x] ExportWalletTransaction model
- [x] DocumentDispatch model
- [x] YardMaterial model
- [x] ExportInvoice & ExportInvoiceItem models
- [x] proxyBidStatus field on ExportBid

#### Phase 5B: API Endpoints
- [x] GET/POST `/wallet/transactions`
- [x] PUT `/wallet/transactions/[id]` (verification)
- [x] GET `/wallet/[customerId]`
- [x] POST `/yard-jobs/[id]/materials`
- [x] GET `/vehicles/[id]/invoice` (generation)
- [x] GET/POST `/documents`

#### Phase 5D: UI Enhancements
- [x] Finance dashboard (`/finance`)
- [x] Auctioneer "Today's Bids" view (`/auction`)
- [x] Invoice section in vehicle detail
- [x] Document dispatch panel in vehicle detail
- [x] Material/parts section in yard job dialog

### 🔄 In Progress / Next Steps

#### Phase 5C: Workflow Triggers (Priority 3)
- [ ] Auto-create wallet on customer creation
- [ ] Wallet balance check on bid submission
- [ ] Invoice generation trigger on status change
- [ ] BL surrender check (balance == 0)

#### Phase 6: Reports & Analytics
- [ ] Export revenue reports
- [ ] Shipping cost analysis
- [ ] Customer wallet statements
- [ ] Auction success rate metrics

#### Phase 7: External Integrations (Future)
- [ ] Auction house API integration
- [ ] Shipping line tracking API
- [ ] Payment gateway (Stripe/PayPal)
- [ ] WhatsApp/SMS notifications

## File Structure

```
src/app/
├── (dashboard)/vehicle-export/
│   ├── page.tsx                    # Dashboard
│   ├── auction/
│   │   ├── page.tsx               # Auctioneer view
│   │   └── new/page.tsx           # Manual auction entry
│   ├── bids/page.tsx              # Bid management
│   ├── customers/page.tsx         # Customer list
│   ├── finance/page.tsx           # Finance dashboard
│   ├── inventory/
│   │   ├── page.tsx               # Vehicle list
│   │   └── [id]/page.tsx          # Vehicle detail
│   ├── shipments/page.tsx         # Shipment list
│   ├── storefront/page.tsx        # Store config
│   └── yard/page.tsx              # Yard jobs
│
├── api/vehicle-export/
│   ├── bids/
│   │   ├── route.ts               # GET/POST
│   │   └── [id]/route.ts          # GET/PUT/DELETE
│   ├── customers/route.ts         # GET/POST
│   ├── config/route.ts            # GET/PATCH
│   ├── dashboard/route.ts         # GET stats
│   ├── documents/route.ts         # GET/POST
│   ├── shipments/route.ts         # GET/POST
│   ├── vehicles/
│   │   ├── route.ts               # GET/POST
│   │   └── [id]/
│   │       ├── route.ts           # GET/PUT/DELETE
│   │       └── invoice/route.ts   # GET (generate)
│   ├── wallet/
│   │   ├── [customerId]/route.ts  # GET balance
│   │   └── transactions/
│   │       ├── route.ts           # GET/POST
│   │       └── [id]/route.ts      # PUT (verify)
│   └── yard-jobs/
│       ├── route.ts               # GET/POST
│       └── [id]/
│           ├── route.ts           # PUT
│           └── materials/route.ts # POST
│
└── api/public/export/
    ├── bids/route.ts              # POST (submit bid)
    ├── config/route.ts            # GET store config
    └── vehicles/route.ts          # GET listings
```

## API Patterns

### Authentication

**Internal APIs:**
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Public APIs:**
```typescript
const apiKey = request.headers.get('X-API-Key');
const tenantId = request.headers.get('X-Tenant-ID');
// Validate API key against ExportStoreConfig.apiKey
```

### Route Handler Signature (Next.js 15)
```typescript
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // ...
}
```

### Prisma Includes Pattern
```typescript
const vehicle = await prisma.exportVehicle.findFirst({
    where: { id, tenantId },
    include: {
        customer: true,
        shipment: true,
        bids: { include: { customer: true } },
        yardJobs: { orderBy: { createdAt: 'desc' } },
        documents: true,  // DocumentDispatch (1:1)
        invoice: true,    // ExportInvoice (1:1)
    },
});
```

## Common Implementation Tasks

### Adding a New Feature

1. **Schema:** Add model to `prisma/schema.prisma`
2. **Migrate:** Run `npx prisma db push` or `npx prisma migrate dev`
3. **Generate:** Run `npx prisma generate`
4. **API:** Create route in `/api/vehicle-export/`
5. **UI:** Add page/component in `/(dashboard)/vehicle-export/`
6. **Sidebar:** Update `/components/layout/Sidebar.tsx` if needed
7. **Build:** Run `pnpm build` to verify
8. **Document:** Update this file!

### Invoice Generation Logic

```typescript
// Cost breakdown for CIF invoice:
const purchasePrice = vehicle.purchasePrice;
const auctionFee = vehicle.auctionFee;
const transportCost = vehicle.transportCost;  // Inland
const shippingCost = vehicle.shippingCost;    // Ocean freight
const inspectionCost = vehicle.inspectionCost;
const yardCost = SUM(yardJobs.cost + yardMaterials.totalCost);
const commission = 500; // Fixed or configurable

const totalAmount = purchasePrice + auctionFee + transportCost + 
                   shippingCost + inspectionCost + yardCost + commission;
```

### Wallet Transaction Flow

```
1. Customer submits deposit slip → Transaction created (PENDING)
2. Finance staff reviews → Updates to CLEARED or REJECTED
3. If CLEARED → Wallet balance incremented
4. On bid win → Balance checked, deducted
5. Invoice generated → Shows amount due after wallet deduction
```

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
| 2026-01-29 | 5C | Configurable deposit requirement (toggle in storefront settings) |
| 2026-01-29 | 5C | Added BL Surrender Check (Invoice must be PAID) |
| 2026-01-29 | 5D | Added Finance Dashboard, Auctioneer View |
| 2026-01-29 | 5B | Created Wallet, Invoice, Document APIs |
| 2026-01-29 | 5A | Added new Prisma models for Phase 5 |
| 2026-01-28 | 4 | Storefront configuration & public APIs |
| 2026-01-27 | 3 | Bid workflow & auction management |
| 2026-01-26 | 2 | Vehicle management & detail pages |
| 2026-01-25 | 1 | Initial schema & CRUD infrastructure |

---

> **🤖 AI Agent Note:** When implementing new features, always:
> 1. Check this document for existing patterns
> 2. Follow the route handler signature for Next.js 15 (`params: Promise<...>`)
> 3. Use `(prisma as any)` temporarily if new models aren't in generated client
> 4. Run `pnpm build` to verify before marking complete
> 5. **Update this file** with what you implemented
