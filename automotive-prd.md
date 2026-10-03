
```markdown
# 📦 SLICT ERP - New Module: Vehicle Export & Logistics
**Version:** 1.0  
**Target Module:** `src/apps/vehicle-export`  
**Architecture:** Next.js (App Router), Prisma, Server Actions  
**Market Context:** Japan to Sri Lanka/Africa Export (Requires strict JAAI/Masho compliance)

---

## 1. Executive Summary
This module manages the end-to-end lifecycle of exporting vehicles from Japan. It connects three critical departments: **Sales** (Bidding/Client handling), **Auction** (Purchasing), and **Logistics/Yard** (Repairs, Compliance, Shipping).

**Key Constraint:** Unlike a standard inventory system, this module must enforce strict compliance checks (JAAI Inspection, Masho Deregistration) before a "Ship" action is allowed.

---

## 2. Directory Structure
Create the new module following the strict architecture of the existing `spareparts` app.

```text
src/apps/vehicle-export/
├── types.ts              # Shared TypeScript interfaces
├── api.ts                # Server-side DB access functions
├── actions.ts            # Server Actions (Business Logic)
├── constants.ts          # Enums: Ports, Shipping Lines, Statuses
├── utils.ts              # CIF/FOB Calculators
├── components/           # Internal Dashboard Components
│   ├── AuctionEntryForm.tsx
│   ├── ComplianceChecklist.tsx
│   └── YardJobCard.tsx
└── api/                  # Public API Routes (for external website integration)
    ├── inventory/route.ts
    └── bid/route.ts

```

---

## 3. Database Schema (Prisma)

Add the following models to `prisma/schema.prisma`.
*Note: We use the `Export` prefix to avoid conflicts with the existing `Vehicle` model used for the repair shop module.*

```prisma
// ============================================================================
// EXPORT MODULE: Vehicle Trading & Logistics
// ============================================================================

enum ExportStatus {
  DRAFT               // Created manually
  BID_PENDING         // Customer requested via website
  BID_ACCEPTED        // Sales approved limits
  WON_AT_AUCTION      // Purchased at USS/JAA
  IN_YARD             // Arrived at yard (Yokohama/Nagoya)
  PREP_IN_PROGRESS    // Repairs/Cleaning active
  INSPECTION_BOOKED   // JAAI/JEVIC scheduled
  INSPECTION_PASSED   // Ready for export
  INSPECTION_FAILED   // Needs rework
  READY_TO_SHIP       // Documents & Car ready
  SHIPPED             // On vessel
  DELIVERED           // Handed over
}

enum DocStatus {
  PENDING
  APPLIED
  RECEIVED
  TRANSLATED
}

model ExportVehicle {
  id              String       @id @default(cuid())
  tenantId        String
  
  // -- Identity --
  stockNumber     String       @unique // Internal Ref (e.g. SL-2026-001)
  chassisNumber   String       @unique // VIN/Frame No (Primary Key for Logistics)
  make            String
  model           String
  year            Int
  month           Int?
  engineCode      String?
  fuelType        String?      // PETROL, HYBRID, DIESEL, EV
  color           String?
  steering        String       @default("RHD") // RHD/LHD
  transmission    String?      // AT/MT
  mileage         Int?         // in KM
  engineCc        Int?
  
  // -- Auction Data (Source of Truth) --
  auctionHouse    String?      // e.g. "USS Tokyo"
  auctionDate     DateTime?
  lotNumber       String?
  auctionGrade    String?      // 4.5, R, 3.5
  auctionSheetUrl String?      // Image URL from USS
  
  // -- Financials (Internal & External) --
  purchasePrice   Decimal      @default(0) // Buying Price (JPY)
  auctionFee      Decimal      @default(0)
  transportCost   Decimal      @default(0) // Auction to Yard
  repairCost      Decimal      @default(0)
  inspectionCost  Decimal      @default(0) // JAAI fee
  shippingCost    Decimal      @default(0) // Freight
  
  fobPrice        Decimal      @default(0) // Price shown to customer (Vehicle only)
  cifPrice        Decimal      @default(0) // Price including shipping
  currency        String       @default("JPY")
  
  // -- Status & Location --
  status          ExportStatus @default(DRAFT)
  location        String?      // e.g. "Yard A - Bay 4"
  isPublished     Boolean      @default(false) // Visible on public website?
  
  // -- Compliance (The "Market Reality") --
  shakenStatus    DocStatus    @default(PENDING) // Original Registration
  mashoStatus     DocStatus    @default(PENDING) // Export Certificate (Deregistration)
  exportCertUrl   String?      // Scanned Masho
  jaaiStatus      DocStatus    @default(PENDING) // Pre-shipment inspection (Critical for Sri Lanka)
  jaaiCertUrl     String?

  // -- Relations --
  customerId      String?
  customer        Customer?    @relation(fields: [customerId], references: [id])
  
  shipmentId      String?
  shipment        ExportShipment? @relation(fields: [shipmentId], references: [id])
  
  bids            ExportBid[]
  yardJobs        YardJob[]
  photos          ExportVehiclePhoto[]

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([tenantId])
  @@index([status])
  @@index([make, model])
  @@index([isPublished])
}

model ExportVehiclePhoto {
  id              String        @id @default(cuid())
  vehicleId       String
  vehicle         ExportVehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  url             String
  tag             String?       // FRONT, REAR, INTERIOR, DAMAGE, REPAIR_PROOF
  isPublic        Boolean       @default(true) // False = Internal Yard proof only
  createdAt       DateTime      @default(now())
  
  @@index([vehicleId])
}

model ExportBid {
  id              String        @id @default(cuid())
  tenantId        String
  
  vehicleId       String?       // Null if bidding on a generic request ("I want any Vitz")
  vehicle         ExportVehicle? @relation(fields: [vehicleId], references: [id])
  
  customerId      String
  customer        Customer      @relation(fields: [customerId], references: [id])
  
  // Bid Request Details
  requestedMake   String
  requestedModel  String
  maxBudget       Decimal
  currency        String        @default("JPY")
  notes           String?
  
  status          String        @default("PENDING") // PENDING, APPROVED, REJECTED, WON, LOST
  adminNotes      String?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([tenantId])
  @@index([customerId])
  @@index([status])
}

model ExportShipment {
  id              String          @id @default(cuid())
  tenantId        String
  shipmentNumber  String          @unique
  
  vesselName      String
  voyageNumber    String
  shippingLine    String          // e.g. NYK, MOL, HOEGH
  
  departurePort   String          // e.g. YOKOHAMA
  destinationPort String          // e.g. HAMBANTOTA, MOMBASA
  
  etd             DateTime        // Est. Departure
  eta             DateTime        // Est. Arrival
  
  billOfLading    String?         // BL Number (Triggers financial release)
  blUrl           String?
  consignee       String?         // Who receives it
  
  status          String          @default("BOOKED") // BOOKED, SAILED, ARRIVED
  
  vehicles        ExportVehicle[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([tenantId])
  @@index([destinationPort])
}

model YardJob {
  id              String        @id @default(cuid())
  vehicleId       String
  vehicle         ExportVehicle @relation(fields: [vehicleId], references: [id])
  
  title           String        // "Fix Bumper", "Remove Stereo"
  type            String        // REPAIR, CLEANING, INSPECTION_PREP, VANNING
  status          String        @default("TODO") // TODO, IN_PROGRESS, DONE
  
  assignedTo      String?       // User ID of Yard Staff
  completedAt     DateTime?
  
  notes           String?
  proofPhotos     String[]      // URLs
  
  tenantId        String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

```

---

## 4. Backend Logic & API (`src/apps/vehicle-export/api.ts`)

These functions serve as the backend brain for the module.

### A. Inventory Management

**Function:** `getInventory(tenantId: string, filters: InventoryFilters)`

* **Logic:** Fetch vehicles from Prisma.
* **Filter Logic:**
* If `filters.publicOnly === true`, ensure `where: { isPublished: true }`.
* Support filtering by `status` (e.g., show me only cars `WON_AT_AUCTION` to arrange transport).



**Function:** `createVehicleFromAuction(data: AuctionInput)`

* **Context:** The Auction Team uses this to quickly input cars won at USS.
* **Fields:** `chassisNumber`, `purchasePrice`, `auctionSheetUrl`.
* **Auto-Action:** Set `status` to `WON_AT_AUCTION`.

### B. The Compliance Gatekeeper

**Function:** `validateShipmentReadiness(vehicleId: string)`

* **Purpose:** The core "Value Add" of this ERP. Prevents costly mistakes.
* **Logic:**
1. Fetch Vehicle.
2. Check `mashoStatus`. If not `RECEIVED`, throw Error("Export Certificate Missing").
3. Check Destination. If `SRI_LANKA`, check `jaaiStatus`. If not `PASSED`, throw Error("JAAI Inspection Required for Sri Lanka").
4. Return `true` if all checks pass.



---

## 5. Public API Routes (For "Kobemotor" Website)

These endpoints allow the external website to communicate with the ERP securely.

### `GET /api/public/export/vehicles`

* **Auth:** Bearer Token (API Key).
* **Response:** JSON list of cars where `isPublished: true`.
* **Fields:** ID, Make, Model, Year, Mileage, Fuel, FOB Price, Photos (Public only).

### `POST /api/public/export/bids`

* **Auth:** Bearer Token.
* **Payload:** `{ email, vehicleId, bidAmount, message }`
* **Logic:**
1. Upsert `Customer` by email.
2. Create `ExportBid`.
3. Trigger notification to Sales Team Dashboard.



---

## 6. Access Control (RBAC)

Configure these permissions in the existing `rbac.ts`.

| Role | Permissions |
| --- | --- |
| **SALES** | Can View Inventory, Create Bids, View Public Prices, Approve Customer Bids. |
| **AUCTION** | Can Create Vehicle, View Auction Data, Edit Purchase Price. **Cannot** see Sales/FOB Price. |
| **YARD** | Can View Yard Jobs, Upload Photos. **Cannot** see any Financials (Hidden). |
| **DOCS_ADMIN** | Can Edit Masho/JAAI status, Upload Certificates. |
| **CUSTOMER** | (External) Can View "My Bids", View "My Vehicles" (Photos + Status only). |

---

## 7. Implementation Steps for Agent

1. **Schema:** Apply the `prisma/schema.prisma` changes and run `npx prisma generate`.
2. **Scaffold:** Create the directory `src/apps/vehicle-export`.
3. **API Layer:** Implement `api.ts` with the "Compliance Gatekeeper" logic.
4. **Public Routes:** Create `src/app/api/public/export/...` routes.
5. **Testing:**
* Create a test vehicle going to "Sri Lanka".
* Try to mark it `READY_TO_SHIP` without JAAI.
* Ensure the system throws the expected error.



```

```