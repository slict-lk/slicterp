# No-Code Studio — Real-World Scenario & Manual Test Guide

> **Scenario**: A small distribution company called **"Metro Parts Ltd"** uses the ERP system for accounting and CRM. The operations manager wants to track **Spare Parts Inventory**, **Customer Service Tickets**, and a **live Operations Dashboard** — all without writing code.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Scenario A — Custom Modules & Records](#2-scenario-a--custom-modules--records)
3. [Scenario B — CSV Import & Export](#3-scenario-b--csv-import--export)
4. [Scenario C — Live Operations Dashboard](#4-scenario-c--live-operations-dashboard)
5. [Scenario D — Visual Workflow Designer](#5-scenario-d--visual-workflow-designer)
6. [Scenario E — Automation Rules (Legacy)](#6-scenario-e--automation-rules-legacy)
7. [Scenario F — Edge Cases & Negative Tests](#7-scenario-f--edge-cases--negative-tests)
8. [API-Level Test Reference](#8-api-level-test-reference)
9. [Mock Data Catalog](#9-mock-data-catalog)

---

## 1. Prerequisites

| Requirement | Details |
|---|---|
| Running ERP | `pnpm dev` with database seeded |
| Logged-in user | Any user with session (NextAuth) |
| Browser | Chrome/Edge with DevTools open (Network tab) |
| Test CSV file | Provided in [Mock Data](#9-mock-data-catalog) section |

### Quick Health Check

1. Navigate to **`/studio`** — the Studio Hub page should load with stats cards (Modules, Fields, Dashboards, Workflows, Automations).
2. If you see a login redirect, sign in first at `/auth/signin`.

---

## 2. Scenario A — Custom Modules & Records

### A1. Create the "Spare Parts" Module

**Goal**: Build a custom module to track spare parts inventory.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/studio/modules/new` | 4-step wizard loads ("Basic Info" step active) |
| 2 | Enter **Module Name**: `Spare Parts Inventory` | Name field populated |
| 3 | Enter **Description**: `Track warehouse spare parts stock levels and pricing` | Description field populated |
| 4 | Select **Module Icon**: `package` | Icon picker shows selected icon |
| 5 | Click **Next Step** | Advances to "Data Schema" step |

**Schema — Add these fields:**

| # | Label | Field Name (auto-generated) | Type | Required | Extra Config |
|---|-------|-----------------------------|------|----------|-------------|
| 1 | Part Name | `part_name` | text | ✅ Yes | — |
| 2 | SKU | `sku` | text | ✅ Yes | — |
| 3 | Category | `category` | select | ✅ Yes | Options: `Electrical, Mechanical, Hydraulic, Body, Engine` |
| 4 | Quantity In Stock | `quantity_in_stock` | number | ✅ Yes | — |
| 5 | Unit Price | `unit_price` | currency | ✅ Yes | — |
| 6 | Supplier Email | `supplier_email` | email | No | — |
| 7 | Supplier Website | `supplier_website` | url | No | — |
| 8 | Last Restocked | `last_restocked` | date | No | — |
| 9 | Is Active | `is_active` | boolean | No | — |
| 10 | Notes | `notes` | textarea | No | — |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6 | Add all 10 fields using "Add Field" button | All fields appear in the field editor |
| 7 | For "Category" field, enter options: `Electrical, Mechanical, Hydraulic, Body, Engine` | Options are comma-separated in the options input |
| 8 | Click **Next Step** | Advances to "Settings" step |
| 9 | Leave **Active Status** toggled ON | Module will be active |
| 10 | Click **Next Step** | Advances to "Review" step |
| 11 | Verify all 10 fields listed with correct types | Review panel shows field names, types, required flags |
| 12 | Click **Create Module** | Spinner shows → toast "Module created successfully" → redirects to `/studio/modules/{id}` |

**Verify**: Module detail page loads with "Records" tab active (empty table).

---

### A2. Create Records Manually

**Goal**: Add spare parts records one-by-one via the UI form.

Navigate to the new module's detail page → click **"+ New Record"**.

**Record 1 — Brake Pad Set**

| Field | Value |
|-------|-------|
| Part Name | `Brake Pad Set - Front` |
| SKU | `BP-FRT-001` |
| Category | `Mechanical` |
| Quantity In Stock | `250` |
| Unit Price | `45.99` |
| Supplier Email | `orders@brakemaster.com` |
| Supplier Website | `https://brakemaster.com` |
| Last Restocked | `2026-02-15` |
| Is Active | `✅ (checked)` |
| Notes | `Standard ceramic brake pads for sedans. Minimum reorder: 50 units.` |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill all fields as above | Form shows all field types correctly |
| 2 | Click **Create Record** | Toast "Record created successfully" → redirects to module page |
| 3 | Verify record appears in table | First 5 columns visible: Part Name, SKU, Category, Quantity, Unit Price |

**Record 2 — Alternator Assembly**

| Field | Value |
|-------|-------|
| Part Name | `Alternator Assembly 12V` |
| SKU | `ALT-12V-003` |
| Category | `Electrical` |
| Quantity In Stock | `45` |
| Unit Price | `189.50` |
| Supplier Email | `supply@voltparts.io` |
| Supplier Website | `https://voltparts.io/catalog` |
| Last Restocked | `2026-01-28` |
| Is Active | `✅` |
| Notes | `Compatible with 2020-2025 models. Lead time: 2 weeks.` |

**Record 3 — Hydraulic Cylinder**

| Field | Value |
|-------|-------|
| Part Name | `Hydraulic Lift Cylinder` |
| SKU | `HYD-LFT-007` |
| Category | `Hydraulic` |
| Quantity In Stock | `12` |
| Unit Price | `520.00` |
| Supplier Email | `sales@hydroforce.lk` |
| Supplier Website | `https://hydroforce.lk` |
| Last Restocked | `2025-12-10` |
| Is Active | `✅` |
| Notes | `Heavy duty. Safety cert expires 2027-06.` |

**Record 4 — Engine Oil Filter**

| Field | Value |
|-------|-------|
| Part Name | `Engine Oil Filter - Universal` |
| SKU | `ENG-OIL-012` |
| Category | `Engine` |
| Quantity In Stock | `800` |
| Unit Price | `8.75` |
| Supplier Email | `bulk@filterworld.com` |
| Supplier Website | `https://filterworld.com` |
| Last Restocked | `2026-03-01` |
| Is Active | `✅` |
| Notes | `Bulk supplier. MOQ 200 units.` |

**Record 5 — Discontinued Part**

| Field | Value |
|-------|-------|
| Part Name | `Side Mirror Housing (Legacy)` |
| SKU | `BDY-MRR-099` |
| Category | `Body` |
| Quantity In Stock | `3` |
| Unit Price | `75.00` |
| Supplier Email | *(leave blank)* |
| Supplier Website | *(leave blank)* |
| Last Restocked | `2024-06-01` |
| Is Active | `❌ (unchecked)` |
| Notes | `DISCONTINUED - last 3 units. No reorder.` |

After creating all 5 records, the module detail table should show 5 rows.

---

### A3. Create the "Service Tickets" Module

**Goal**: Track customer service requests.

Navigate to `/studio/modules/new` and create with these settings:

| Property | Value |
|----------|-------|
| Name | `Service Tickets` |
| Description | `Customer support and service request tracking` |
| Icon | `headphones` |

**Fields:**

| # | Label | Type | Required | Extra |
|---|-------|------|----------|-------|
| 1 | Ticket Title | text | ✅ | — |
| 2 | Customer Name | text | ✅ | — |
| 3 | Customer Email | email | ✅ | — |
| 4 | Priority | select | ✅ | Options: `Low, Medium, High, Critical` |
| 5 | Status | select | ✅ | Options: `Open, In Progress, Waiting, Resolved, Closed` |
| 6 | Description | textarea | No | — |
| 7 | Assigned To | text | No | — |
| 8 | Contact Phone | phone | No | — |

Create module, then add these records:

**Ticket 1:**
| Field | Value |
|-------|-------|
| Ticket Title | `Brake noise after service` |
| Customer Name | `Amal Perera` |
| Customer Email | `amal.perera@gmail.com` |
| Priority | `High` |
| Status | `Open` |
| Description | `Customer reports grinding noise from front brakes 2 days after pad replacement. Vehicle: Toyota Corolla 2023.` |
| Assigned To | `Nimal Silva` |
| Contact Phone | `+94771234567` |

**Ticket 2:**
| Field | Value |
|-------|-------|
| Ticket Title | `Quote request for fleet maintenance` |
| Customer Name | `Colombo Logistics PLC` |
| Customer Email | `fleet@colombologistics.lk` |
| Priority | `Medium` |
| Status | `In Progress` |
| Description | `Fleet of 35 trucks. Need annual maintenance contract quote. Contact: Mr. Kamal, Fleet Manager.` |
| Assigned To | `Sunil Fernando` |
| Contact Phone | `+94112345678` |

**Ticket 3:**
| Field | Value |
|-------|-------|
| Ticket Title | `Wrong part delivered` |
| Customer Name | `Dilshan Auto Repairs` |
| Customer Email | `dilshan@dilshanauto.com` |
| Priority | `Critical` |
| Status | `Open` |
| Description | `Ordered ALT-12V-003 but received ALT-24V-001. Need urgent replacement.` |
| Assigned To | *(leave blank)* |
| Contact Phone | `+94777654321` |

---

## 3. Scenario B — CSV Import & Export

### B1. Export Records to CSV

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Spare Parts module page (`/studio/modules/{id}`) | Module with 5 records visible |
| 2 | Click **Export CSV** button (bottom of records tab) | CSV file downloads |
| 3 | Open downloaded file | Headers: `part_name,sku,category,quantity_in_stock,unit_price,supplier_email,supplier_website,last_restocked,is_active,notes` |
| 4 | Verify all 5 records present | Data matches what was entered |
| 5 | Check for CSV injection protection | No cell starts with `=`, `+`, `-`, `@`, `\t`, or `\r` |

### B2. Import Records from CSV

Create a file called `import_spare_parts.csv` with this content:

```csv
part_name,sku,category,quantity_in_stock,unit_price,supplier_email,supplier_website,last_restocked,is_active,notes
Timing Belt Kit,TBK-UNI-015,Engine,120,34.50,orders@beltco.com,https://beltco.com,2026-02-20,true,Standard timing belt kit. Fits most 4-cylinder engines.
Headlight Bulb H7,BDY-HLB-022,Electrical,500,12.99,sales@brightlights.com,https://brightlights.com/h7,2026-03-05,true,LED replacement. 6000K white.
Shock Absorber - Rear,MCH-SHK-008,Mechanical,65,87.25,supply@ridesmooth.com,https://ridesmooth.com,2026-01-15,true,Gas-filled. Fits SUV class vehicles.
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Spare Parts module page | Module detail page loads |
| 2 | Click **Import** button | File upload dialog appears |
| 3 | Select `import_spare_parts.csv` | File is accepted (< 5MB, .csv extension) |
| 4 | Submit import | Toast "Successfully imported 3 records" |
| 5 | Verify table now shows **8 total records** | 5 original + 3 imported |
| 6 | Verify imported records have correct data | Spot-check "Timing Belt Kit" row |

### B3. Import Error Handling

Create a file called `bad_import.csv`:

```csv
part_name,sku,category,quantity_in_stock,unit_price,supplier_email
,MISSING-NAME,Electrical,10,5.00,test@test.com
Good Part,GP-001,Electrical,20,10.00,not-an-email
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try importing `bad_import.csv` | Error response with row-level details |
| 2 | Verify Row 1 error | Missing required field `part_name` |
| 3 | Verify Row 2 error | Invalid email format for `supplier_email` |
| 4 | Verify no records were created | Record count unchanged |

### B4. File Validation Tests

| Test | File | Expected |
|------|------|----------|
| Oversized file | Any file > 5MB | Error: "File size exceeds 5MB limit" |
| Wrong extension | `data.xlsx` | Error: "Only CSV files are supported" |
| Uppercase extension | `data.CSV` | Should be accepted (case-insensitive) |
| Empty file | Empty `.csv` | No records imported, no crash |

---

## 4. Scenario C — Live Operations Dashboard

### C1. Create "Metro Parts Operations" Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/studio/dashboards/new` | Dashboard Builder loads |
| 2 | Enter **Name**: `Metro Parts Operations` | — |
| 3 | Enter **Description**: `Real-time operations overview for Metro Parts Ltd` | — |
| 4 | Leave "Set as Default" **OFF** | — |

### C2. Add Widgets

Add these widgets using the widget type buttons at the bottom of the left panel:

**Widget 1 — Total Revenue (Metric)**

| Setting | Value |
|---------|-------|
| Type | Metric (click "Add Metric" button) |
| Title | `Total Revenue` |
| Data Source | `accounting_invoices` |
| Metrics | `total_revenue` |

**Widget 2 — Active Customers (Metric)**

| Setting | Value |
|---------|-------|
| Type | Metric |
| Title | `Active Customers` |
| Data Source | `accounting_invoices` |
| Metrics | `total_revenue` |

> Note: In a real deployment you'd use `erp:crm` / `total_customers`. Use any available connector for testing.

**Widget 3 — Revenue Trend (Chart)**

| Setting | Value |
|---------|-------|
| Type | Chart (click "Add Chart" button) |
| Title | `Revenue Trend` |
| Data Source | `accounting_invoices` |
| Chart Type | `line` |
| Metrics | `total_revenue` |

**Widget 4 — Recent Invoices (Table)**

| Setting | Value |
|---------|-------|
| Type | Table (click "Add Table" button) |
| Title | `Recent Invoices` |
| Data Source | `accounting_invoices` |
| Metrics | `recent_invoices` |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 5 | After adding all 4 widgets | Widget cards appear in the config panel |
| 6 | Click **Save Dashboard** | Toast "Dashboard created successfully" → redirects to dashboards list |

### C3. View Live Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the new dashboard from the list | Dashboard view page loads at `/studio/dashboards/{id}` |
| 2 | Observe widget grid | 4 widgets arranged in grid layout |
| 3 | Metric widgets | Show a number with trend indicator (up/down arrow + percentage) |
| 4 | Chart widget | Renders full-width with chart visualization (or "Data source unavailable" if no accounting data) |
| 5 | Table widget | Renders full-width with tabular data (or error state) |
| 6 | Click **Refresh** button | All widgets reload with loading spinners |

**Layout Verification:**
- Metric widgets: half-width (6 of 12 columns), side by side
- Chart widget: full-width (12 columns)
- Table widget: full-width (12 columns)

### C4. Edit Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Edit Layout** button | Navigates to `/studio/dashboards/{id}/edit` |
| 2 | Change dashboard name to `Metro Parts — Live Ops` | Name field updates |
| 3 | Delete one widget (click trash icon) | Widget removed from list |
| 4 | Click **Save Changes** | Toast confirms save → redirects |
| 5 | Re-open dashboard | Verify changes persisted (renamed, widget gone) |

---

## 5. Scenario D — Visual Workflow Designer

### D1. Create "High-Value Invoice Alert" Workflow

**Goal**: When triggered, check if amount is above threshold, then fire a webhook.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/studio/workflows/new` | Workflow Designer loads with ReactFlow canvas |
| 2 | Enter **name**: `High-Value Invoice Alert` in the top-left input | — |

**Add Nodes by Drag & Drop:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3 | Drag **"Event Trigger"** from left sidebar to canvas | Yellow trigger node appears on canvas |
| 4 | Click the trigger node | Right panel "Configuration" activates |
| 5 | Set **Target Module**: `invoices` | Dropdown selection |
| 6 | Set **Event**: `Record Created` | Dropdown selection |
| 7 | Drag **"If/Else Condition"** node to canvas (right of trigger) | Blue condition node appears |
| 8 | Click the condition node | Config panel shows condition fields |
| 9 | Set **Field to Check**: `total` | Text input |
| 10 | Set **Logic Operator**: `Greater Than` | Dropdown |
| 11 | Set **Value**: `5000` | Text input |
| 12 | Drag **"Data Action"** node to canvas (right of condition) | Green action node appears |
| 13 | Click the action node | Config panel shows action fields |
| 14 | Set **Action Type**: `HTTP Webhook` | Dropdown |
| 15 | Scroll down to see the webhook URL config | *(If visible, enter a test URL)* |

**Connect Nodes:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 16 | Drag from trigger node's output handle → condition node's input | Edge connects trigger → condition |
| 17 | Drag from condition node's output handle → action node's input | Edge connects condition → action |
| 18 | Verify 3 nodes and 2 edges on canvas | Workflow is: Trigger → Condition → Action |

**Save:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 19 | Click **Save & Enable** | Spinner → toast "Workflow created" → redirect to `/studio/workflows` |
| 20 | Verify workflow in list page | "High-Value Invoice Alert" shows as **Active** |

### D2. Test Workflow Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On workflows list page, find the workflow | Switch shows **On** |
| 2 | Click the toggle switch | Switch flips to **Off**, badge changes to "Disabled" |
| 3 | Click the toggle again | Switch flips back to **On**, badge shows "Active" |
| 4 | Verify optimistic update | Toggle updates instantly (no full page reload) |

### D3. Edit Existing Workflow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the workflow name to open it | Designer loads with existing nodes/edges |
| 2 | Click the condition node | Right panel populates with saved config |
| 3 | Change **Value** from `5000` to `10000` | Config updates |
| 4 | Click on the action node | Config panel shows action config |
| 5 | Click **Delete Node** (red button at bottom of config) | Node removed, selection cleared, edges to/from it removed |
| 6 | Add a new action node, connect it | New node appears and connects |
| 7 | Click **Save** | Changes persisted |

### D4. View Execution History

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to workflow → click **"View History"** or go to `/studio/workflows/{id}/executions` | Execution History page loads |
| 2 | Observe the stats cards | Total Runs, Success Rate (%), Failed Runs |
| 3 | If no executions exist | Table shows "No executions recorded for this workflow yet." |
| 4 | Click **Refresh Logs** | Fetches latest execution data |

---

## 6. Scenario E — Automation Rules (Legacy)

### E1. Create "Low Stock Alert" Rule

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/studio/automation/new` | "Create Automation Rule" form loads with Legacy notice banner |
| 2 | Enter **Rule Name**: `Low Stock Email Alert` | — |
| 3 | Enter **Description**: `Sends email notification when part quantity drops below 20` | — |
| 4 | Toggle **Active**: ON | Switch checked |
| 5 | Set **Target Module**: `Inventory` | Select dropdown |
| 6 | Set **Event**: `Updated` | Select dropdown |

**Configure Conditions (JSON):**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 7 | In the "Conditions (JSON)" textarea, enter: | — |

```json
[
  {
    "field": "quantity_in_stock",
    "operator": "lessThan",
    "value": 20
  }
]
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 8 | Click outside the textarea (blur) | No error indication (valid JSON) |
| 9 | Set **Action Required**: `Send Email` | Select dropdown |

**Configure Action (JSON):**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 10 | In the "Action Configuration" textarea, enter: | — |

```json
{
  "to": "warehouse@metroparts.com",
  "subject": "Low Stock Alert: Reorder Needed",
  "template": "low_stock_notification"
}
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 11 | Click **Save Rule** | Toast "Automation rule created successfully" → redirects to `/studio/automation` |
| 12 | Verify rule in list | "Low Stock Email Alert" card with **Active** badge |

### E2. Test Automation Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "Low Stock Email Alert" in the list | Toggle shows **On** |
| 2 | Click the toggle switch | Optimistically flips to **Off** → badge shows "Disabled" |
| 3 | Click again | Flips back to **On** → badge shows "Active" |
| 4 | Open DevTools Network tab, click toggle | See PUT request to `/api/studio/automation/{id}/toggle` with `{ isActive: false }` |
| 5 | Verify response | `200 OK` with `{ data: { success: true, isActive: false } }` |

### E3. Conditions JSON Edge Cases

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type invalid JSON in conditions textarea: `[{ broken` | Textarea value updates freely (no reset) |
| 2 | Click outside textarea (blur) | Red border appears, "Invalid JSON" error text shows below |
| 3 | Fix JSON back to valid | On blur, error clears |
| 4 | Try to submit with invalid conditions JSON | Toast: "Conditions must be valid JSON" — form doesn't submit |
| 5 | Try to submit with invalid Action Config JSON | Toast: "Action Configuration must be valid JSON" — form doesn't submit |

---

## 7. Scenario F — Edge Cases & Negative Tests

### F1. Module Creation Validation

| Test | Action | Expected |
|------|--------|----------|
| Empty name | Leave name blank, click Next | Toast: "Module name is required" |
| Empty field labels | Add field with no label, click Next | Toast: "All fields must have a label" |
| Single field | Create module with just 1 field | Should succeed |
| Duplicate field names | Add two fields named "email" | Should still create (handled by auto-generation) |

### F2. Record Validation

| Test | Input | Expected |
|------|-------|----------|
| Missing required field | Leave "Part Name" empty | Validation error on form |
| Invalid email | Enter `not-an-email` in email field | Validation error |
| Invalid URL | Enter `just-text` in URL field | Validation error |
| Invalid phone | Enter `12` in phone field | Validation error (min 5 chars) |
| Negative number | Enter `-5` for quantity | Depends on field min config |
| Valid boolean | Check/uncheck boolean field | Should toggle cleanly |
| Empty optional fields | Leave all optional fields blank | Record creates successfully |

### F3. Workflow Designer Edge Cases

| Test | Action | Expected |
|------|--------|----------|
| Drop without canvas init | Try to drop a node immediately | Node is **not** added (guard: `!reactFlowInstance`) |
| Delete selected node | Click node → Delete Node button | Node removed, selection cleared (`selectedNode` set to null) |
| Save empty workflow | Click Save with no nodes | Depends on API validation |
| Disconnect and reconnect | Delete edge, redraw it | Edge reconnects |

### F4. Dashboard Limits

| Test | Action | Expected |
|------|--------|----------|
| No widgets | Try to save dashboard with 0 widgets | Toast: "Add at least one widget" |
| No name | Leave name field empty, click Save | Toast: "Dashboard name is required" |
| Data source unavailable | Widget with non-existent data source | Widget shows "Data source unavailable" error state |
| Rapid refresh | Click Refresh button multiple times quickly | No duplicate fetches (AbortController cancels previous) |

### F5. API Pagination

| Test | API Call | Expected |
|------|----------|----------|
| Default | `GET /api/studio/modules` | Returns max 50 records |
| Custom page | `GET /api/studio/modules?skip=0&take=10` | Returns 10 records |
| Bad pagination | `GET /api/studio/modules?skip=-1&take=999` | Clamped: skip=0, take=100 (max) |
| String params | `GET /api/studio/modules?skip=abc&take=xyz` | Defaults: skip=0, take=50 |

### F6. Security Tests

| Test | Action | Expected |
|------|--------|----------|
| Unauthenticated | Call any Studio API without session | 401 Unauthorized |
| Cross-tenant access | Attempt to access another tenant's module | 404 (tenant-scoped queries) |
| CSV injection | Import CSV with cell `=CMD("calc")` | Cell sanitized (leading `=` stripped) |
| Widget IDOR | PUT `/api/studio/dashboards/{dashboard1}/widgets/{widgetFromDashboard2}` | 404 "Widget not found in this dashboard" |
| XSS in field values | Record with `<script>alert(1)</script>` in text field | Stored as text, React escapes on render |

---

## 8. API-Level Test Reference

For testers who prefer direct API testing (e.g., via Postman or `curl`):

### Create Module
```bash
curl -X POST http://localhost:3000/api/studio/modules \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "name": "Spare Parts Inventory",
    "description": "Track warehouse spare parts",
    "icon": "package",
    "isActive": true,
    "schema": { "fields": [] },
    "views": [{ "type": "list", "name": "All Records" }],
    "fields": [
      { "name": "part_name", "label": "Part Name", "type": "text", "required": true, "sequence": 0, "isSystem": false },
      { "name": "sku", "label": "SKU", "type": "text", "required": true, "sequence": 1, "isSystem": false },
      { "name": "category", "label": "Category", "type": "select", "required": true, "options": ["Electrical","Mechanical","Hydraulic","Body","Engine"], "sequence": 2, "isSystem": false },
      { "name": "quantity_in_stock", "label": "Quantity In Stock", "type": "number", "required": true, "sequence": 3, "isSystem": false },
      { "name": "unit_price", "label": "Unit Price", "type": "currency", "required": true, "sequence": 4, "isSystem": false },
      { "name": "supplier_email", "label": "Supplier Email", "type": "email", "required": false, "sequence": 5, "isSystem": false },
      { "name": "notes", "label": "Notes", "type": "textarea", "required": false, "sequence": 6, "isSystem": false }
    ]
  }'
```

### Create Record
```bash
curl -X POST http://localhost:3000/api/studio/modules/MODULE_ID/records \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "data": {
      "part_name": "Brake Pad Set - Front",
      "sku": "BP-FRT-001",
      "category": "Mechanical",
      "quantity_in_stock": 250,
      "unit_price": 45.99,
      "supplier_email": "orders@brakemaster.com",
      "notes": "Standard ceramic brake pads"
    }
  }'
```

### Create Dashboard with Widgets
```bash
curl -X POST http://localhost:3000/api/studio/dashboards \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "name": "Metro Parts Operations",
    "description": "Real-time operations dashboard",
    "isDefault": false,
    "layout": {
      "cols": 12,
      "rows": 8,
      "items": [
        { "widgetId": "w1", "x": 0, "y": 0, "w": 6, "h": 2 },
        { "widgetId": "w2", "x": 6, "y": 0, "w": 6, "h": 2 },
        { "widgetId": "w3", "x": 0, "y": 2, "w": 12, "h": 4 }
      ]
    },
    "widgets": [
      { "id": "w1", "title": "Total Revenue", "type": "metric", "dataSource": "accounting_invoices", "metrics": ["total_revenue"] },
      { "id": "w2", "title": "Active Customers", "type": "metric", "dataSource": "accounting_invoices", "metrics": ["total_revenue"] },
      { "id": "w3", "title": "Revenue Trend", "type": "chart", "dataSource": "accounting_invoices", "chartType": "line", "metrics": ["total_revenue"] }
    ]
  }'
```

### Create Workflow
```bash
curl -X POST http://localhost:3000/api/studio/workflows \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "name": "High-Value Invoice Alert",
    "description": "Alert when invoice exceeds 5000",
    "triggerType": "record_created",
    "triggerConfig": { "moduleId": "invoices" },
    "nodes": [
      { "id": "trigger-1", "type": "triggerNode", "position": { "x": 100, "y": 200 }, "data": { "label": "Invoice Created", "type": "trigger", "config": { "target": "invoices", "event": "created" } } },
      { "id": "condition-1", "type": "conditionNode", "position": { "x": 400, "y": 200 }, "data": { "label": "Amount > 5000", "type": "condition", "config": { "field": "total", "operator": "greater_than", "value": "5000" } } },
      { "id": "action-1", "type": "actionNode", "position": { "x": 700, "y": 200 }, "data": { "label": "Send Email", "type": "action", "config": { "actionType": "send_email", "emailTo": "admin@metroparts.com" } } }
    ],
    "edges": [
      { "id": "e1", "source": "trigger-1", "target": "condition-1" },
      { "id": "e2", "source": "condition-1", "target": "action-1" }
    ],
    "isActive": true
  }'
```

### Create Automation Rule
```bash
curl -X POST http://localhost:3000/api/studio/automation \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "name": "Low Stock Email Alert",
    "description": "Email when stock below 20 units",
    "module": "inventory",
    "event": "updated",
    "conditions": "[{\"field\":\"quantity_in_stock\",\"operator\":\"lessThan\",\"value\":20}]",
    "action": "send_email",
    "actionConfig": "{\"to\":\"warehouse@metroparts.com\",\"subject\":\"Low Stock Alert\"}",
    "isActive": true
  }'
```

### Toggle Automation
```bash
curl -X PUT http://localhost:3000/api/studio/automation/RULE_ID/toggle \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{ "isActive": false }'
```

### Reorder Fields
```bash
curl -X PUT http://localhost:3000/api/studio/modules/MODULE_ID/fields/reorder \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{ "fieldIds": ["field-id-3", "field-id-1", "field-id-2"] }'
```

### Data Source Preview
```bash
curl -X POST http://localhost:3000/api/studio/data-sources/preview \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "connectorId": "erp:accounting",
    "config": { "metric": "total_revenue" }
  }'
```

---

## 9. Mock Data Catalog

### 9.1 Spare Parts — Complete Dataset (Copy-Paste Ready)

| part_name | sku | category | quantity_in_stock | unit_price | supplier_email | supplier_website | last_restocked | is_active | notes |
|-----------|-----|----------|-------------------|------------|----------------|------------------|----------------|-----------|-------|
| Brake Pad Set - Front | BP-FRT-001 | Mechanical | 250 | 45.99 | orders@brakemaster.com | https://brakemaster.com | 2026-02-15 | true | Standard ceramic brake pads for sedans. MOQ 50. |
| Alternator Assembly 12V | ALT-12V-003 | Electrical | 45 | 189.50 | supply@voltparts.io | https://voltparts.io/catalog | 2026-01-28 | true | 2020-2025 models. Lead time: 2 weeks. |
| Hydraulic Lift Cylinder | HYD-LFT-007 | Hydraulic | 12 | 520.00 | sales@hydroforce.lk | https://hydroforce.lk | 2025-12-10 | true | Heavy duty. Safety cert expires 2027-06. |
| Engine Oil Filter - Universal | ENG-OIL-012 | Engine | 800 | 8.75 | bulk@filterworld.com | https://filterworld.com | 2026-03-01 | true | Bulk supplier. MOQ 200. |
| Side Mirror Housing (Legacy) | BDY-MRR-099 | Body | 3 | 75.00 | | | 2024-06-01 | false | DISCONTINUED - last 3 units. |
| Timing Belt Kit | TBK-UNI-015 | Engine | 120 | 34.50 | orders@beltco.com | https://beltco.com | 2026-02-20 | true | Fits most 4-cylinder engines. |
| Headlight Bulb H7 | BDY-HLB-022 | Electrical | 500 | 12.99 | sales@brightlights.com | https://brightlights.com/h7 | 2026-03-05 | true | LED 6000K white. |
| Shock Absorber - Rear | MCH-SHK-008 | Mechanical | 65 | 87.25 | supply@ridesmooth.com | https://ridesmooth.com | 2026-01-15 | true | Gas-filled. SUV class. |

### 9.2 Service Tickets — Complete Dataset

| ticket_title | customer_name | customer_email | priority | status | description | assigned_to | contact_phone |
|-------------|---------------|----------------|----------|--------|-------------|-------------|---------------|
| Brake noise after service | Amal Perera | amal.perera@gmail.com | High | Open | Grinding noise from front brakes 2 days after pad replacement. Toyota Corolla 2023. | Nimal Silva | +94771234567 |
| Quote request for fleet maintenance | Colombo Logistics PLC | fleet@colombologistics.lk | Medium | In Progress | Fleet of 35 trucks. Annual maintenance contract quote. Contact: Mr. Kamal. | Sunil Fernando | +94112345678 |
| Wrong part delivered | Dilshan Auto Repairs | dilshan@dilshanauto.com | Critical | Open | Ordered ALT-12V-003 but received ALT-24V-001. Need urgent replacement. | | +94777654321 |
| Warranty claim for alternator | Perera Motors | service@perera-motors.lk | Medium | Waiting | ALT-12V-003 failed after 3 months. Under warranty. Need replacement. | Nimal Silva | +94771122334 |
| Bulk order inquiry | National Transport Board | procurement@ntb.gov.lk | Low | Open | Government tender for 500 oil filters. Need quotation by March 30. | Sunil Fernando | +94112223344 |

### 9.3 CSV Import File — `import_spare_parts.csv`

```csv
part_name,sku,category,quantity_in_stock,unit_price,supplier_email,supplier_website,last_restocked,is_active,notes
Timing Belt Kit,TBK-UNI-015,Engine,120,34.50,orders@beltco.com,https://beltco.com,2026-02-20,true,Standard timing belt kit. Fits most 4-cylinder engines.
Headlight Bulb H7,BDY-HLB-022,Electrical,500,12.99,sales@brightlights.com,https://brightlights.com/h7,2026-03-05,true,LED replacement. 6000K white.
Shock Absorber - Rear,MCH-SHK-008,Mechanical,65,87.25,supply@ridesmooth.com,https://ridesmooth.com,2026-01-15,true,Gas-filled. Fits SUV class vehicles.
```

### 9.4 CSV Bad Import File — `bad_import.csv`

```csv
part_name,sku,category,quantity_in_stock,unit_price,supplier_email
,MISSING-NAME,Electrical,10,5.00,test@test.com
Good Part,GP-001,Electrical,20,10.00,not-an-email
```

### 9.5 Automation Conditions JSON

```json
[
  {
    "field": "quantity_in_stock",
    "operator": "lessThan",
    "value": 20
  }
]
```

### 9.6 Automation Action Config JSON

```json
{
  "to": "warehouse@metroparts.com",
  "subject": "Low Stock Alert: Reorder Needed",
  "template": "low_stock_notification"
}
```

---

## Test Completion Checklist

| # | Area | Test | Pass? |
|---|------|------|-------|
| 1 | Studio Hub | Hub page loads with stats | ☐ |
| 2 | Modules | Create "Spare Parts" module (10 fields) | ☐ |
| 3 | Modules | Create "Service Tickets" module (8 fields) | ☐ |
| 4 | Records | Create 5 spare part records | ☐ |
| 5 | Records | Create 3 service ticket records | ☐ |
| 6 | Records | Edit a record and save | ☐ |
| 7 | Records | Delete a record | ☐ |
| 8 | Records | Validation errors display correctly | ☐ |
| 9 | Export | Export CSV downloads with correct data | ☐ |
| 10 | Import | Import 3 records from CSV | ☐ |
| 11 | Import | Bad CSV shows row-level errors | ☐ |
| 12 | Import | File validation (size, type, case-insensitive ext) | ☐ |
| 13 | Dashboard | Create dashboard with 4 widgets | ☐ |
| 14 | Dashboard | View live dashboard (widgets render) | ☐ |
| 15 | Dashboard | Edit dashboard (rename, remove widget) | ☐ |
| 16 | Dashboard | Refresh button works | ☐ |
| 17 | Dashboard | Layout: metrics half-width, chart/table full-width | ☐ |
| 18 | Workflow | Create workflow with 3 nodes + 2 edges | ☐ |
| 19 | Workflow | Toggle workflow on/off (optimistic update) | ☐ |
| 20 | Workflow | Edit workflow (delete node, add node) | ☐ |
| 21 | Workflow | View execution history page | ☐ |
| 22 | Automation | Create automation rule with JSON conditions | ☐ |
| 23 | Automation | Toggle automation on/off (optimistic update) | ☐ |
| 24 | Automation | Conditions textarea raw state (no reset on invalid JSON) | ☐ |
| 25 | Automation | JSON validation errors on blur and submit | ☐ |
| 26 | Security | Unauthenticated API call → 401 | ☐ |
| 27 | Security | Widget IDOR check → 404 | ☐ |
| 28 | Pagination | Default and clamped pagination values | ☐ |
| 29 | Field Reorder | Reorder requires complete field set | ☐ |
| 30 | Search | Module/dashboard/workflow search filters | ☐ |
