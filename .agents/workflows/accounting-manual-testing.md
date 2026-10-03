---
description: Fully comprehensive manual QA verification and real-world testing guide for all ERP accounting functions
---

# 🚀 Ultimate Accounting & Multi-Module Testing Guide

This guide ensures **100% functional coverage** of the ERP's financial core. Follow these steps to verify that every module correctly communicates with the Ledger.

---

## 🛠️ Step 0: Global Setup

### 1. Multi-Currency Support
- **Navigate to:** Sidebar → Settings (or Tenant Settings if available).
- Ensure **Base Currency** is `LKR` and you have at least `USD` as a secondary currency for Vehicle Exports.

### 2. Full Chart of Accounts (COA)
**Navigate to:** Accounting → **Chart of Accounts**
Add these critical accounts (if missing):

| Code | Name | Type | Normal | Notes |
|------|------|------|--------|-------|
| `1010` | Commercial Bank (LKR) | ASSET | Debit | Main LKR operating account |
| `1011` | HNB Bank (USD) | ASSET | Debit | Foreign currency wallet |
| `1012` | Petty Cash | ASSET | Debit | Small cash fund for incidental expenses |
| `1200` | Accounts Receivable | ASSET | Debit | Linked to Sales/Invoices |
| `2000` | Accounts Payable | LIABILITY | Credit | Linked to Purchases |
| `2200` | Customer Deposits | LIABILITY | Credit | For Hotel/Vehicle advance payments |
| `4000` | Sales Revenue (Parts) | REVENUE | Credit | Spareparts income |
| `4100` | Hotel Room Revenue | REVENUE | Credit | From Room bookings |
| `4200` | Vehicle Export Revenue | REVENUE | Credit | From Bid wins |
| `4300` | Property Rent Income | REVENUE | Credit | From Leases |
| `5000` | COGS | EXPENSE | Debit | Cost of goods sold |
| `5100` | Maintenance Expense | EXPENSE | Debit | Property/Yard repairs |

---

## 🏨 Step 1: Hotel Module (Front-Desk to Ledger)

### A. The "Full Stay" Test
1. **Create Booking:** Go to Hotel → Bookings → **New Booking**.
   - select a guest, any room, and set status to `CHECKED_IN`.
2. **Add Folio Charges (The "Mini-bar" Test):**
   - Click "View Folio".
   - Add a charge: Type: `Food`, Description: `Club Sandwich`, Amount: `1200`.
   - Add a charge: Type: `Laundry`, Description: `Suit Cleaning`, Amount: `2500`.
   - **✅ Verify:** Totals update in real-time.
3. **The "Check-Out" Transaction:** 
   - Click **"Check Out"**.
   - **✅ Verify Status:** Booking is `CHECKED_OUT`.
   - **✅ Verify Housekeeping:** Go to "Rooms" tab; that room must now be **"DIRTY"**.
   - **✅ Verify Accounting:** Go to Accounting → **Journal Entries**. Find a new entry for "Hotel Check-Out". Total should equal Room Price + Folio Charges.

---

## 🚢 Step 2: Vehicle Export (International Trade)

### A. Purchase to Yard
1. **Add Vehicle:** Vehicle Export → Inventory → **Add Vehicle**.
   - Purchase Price: `$8,000`.
   - **✅ Verify Transaction:** Go to Accounting → Journal Entries. A `VEHICLE_PURCHASE` entry should exist (if GL Bridge is active).
2. **Auto-Yard Job:** Go to Vehicle Export → **Yard**. 
   - **✅ Verify:** An "Initial Inspection" job should have been auto-created for your new vehicle.

### B. The Bidding & Wallet Flow
1. **Bid Creation:** Vehicle Export → Bids. Create a bid for a customer at `$12,000`.
2. **The "Win":** Mark Bid as **"WON"**.
   - **✅ Verify Accounting:** A JE for `EXPORT_SALE` should appear.
3. **Wallet Clearance:** Go to Vehicle Export → **Wallet**.
   - Record a `$5,000` Deposit. Balance stays `$0` (Pending).
   - Click **"Clear"**.
   - **✅ Verify Balance:** Balance becomes `$5,000`.
   - **✅ Verify GL:** A JE for `CUSTOMER_DEPOSIT` appears.
   - **✅ Verify Status:** Check the transaction history; `glPostingStatus` should be `POSTED`.

---

## ⚙️ Step 3: Spareparts (Inventory & POS)

### A. Stock Protection Test
1. **Low Stock Warning:** Pick a part with `stockQty = 2`.
2. **Oversell Attempt:** Create a Sale for `3` units.
3. **✅ Expected:** System must block the confirmation with **"Insufficient stock"**.
4. **Valid Sale:** Sell `1` unit. 
   - **✅ Verify:** Stock drops to `1`.
   - **✅ Verify Accounting:** A JE for `SPAREPARTS_SALE` appears.

---

## 🏢 Step 4: Properties (Leasing & Maintenance)

### A. Lease Security
1. **Create Lease:** Start a new lease.
2. **Validation Test:** Try entering `-1000` for Rent.
3. **✅ Expected:** System blocks submission (Negative numbers disallowed).
4. **Confirm Lease:** Set Rent to `50,000`.
   - **✅ Verify GL:** Monthly rent should post to `Property Rent Income`.

### B. Maintenance Expenses
1. **Record Repair:** Property → Maintenance. Add a "Pipe Burst Repair" for `12,000`. 
2. **✅ Expected:** JE posts to `Maintenance Expense` vs `Cash/Bank`.

---

## 📊 Step 5: Advanced Accounting Operations

### 1. Manual Journal Entries
- Create a JE for "Inter-bank Transfer".
- Debit `Commercial Bank` LKR 100,000.
- Credit `Petty Cash` LKR 100,000.
- **✅ Expected:** Entries show in Ledger. Reports update.

### 2. Expense Management
- Go to Accounting → **Expenses**.
- Record a "Utility Bill" for `8,500`.
- **✅ Expected:** Direct JE created without an invoice (simplified flow).

### 3. Financial Intelligence (Reports)
- **Module Reports:** Go to Accounting → **Module Reports**.
- **✅ Verify:** You should see a bar chart comparing Hotel Revenue vs Spareparts vs Vehicle Export.
- **Fallback Test:** If one module has 0 data, the page should still load (no crash).
- **P&L / Balance Sheet:** Verify that your "Net Profit" matches the math of your sales minus expenses from the steps above.

### 4. Bank Reconciliation
- Upload any CSV or Image.
- **✅ Verify:** AI parsing toast appears. Matches are listed (even if placeholders for now).

---

## 🕵️ Technical "Hidden" Fixes to Verify

- **Invoice Numbers:** Create 3 invoices. Verify they follow `INV-[FULL-UUID]` format (safeguard against collisions).
- **Tenant Isolation:** Log in as User A. Create data. Log in as User B. **Verify User B cannot see any of User A's financial data.**
- **Admin Notes:** Fail a GL post intentionally (e.g., deleted account). Verify that the `adminNote` captures the error message precisely without wiping previous notes.

---
*Testing guide version: 2.0 (Complete Coverage)*
