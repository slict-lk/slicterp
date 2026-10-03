# Comprehensive Requirements Engineering and Technical Implementation Report  
## Custom Vehicle Import/Export ERP

---

## 1. Executive Summary and Strategic Alignment

The development of a custom Enterprise Resource Planning (ERP) system for the Japanese Used Vehicle (JUV) export industry represents a sophisticated challenge in software engineering. This sector is characterized by high-frequency transaction volumes, intricate regulatory compliance frameworks across multiple jurisdictions, and complex multi-currency financial workflows.

The objective of this report is to translate the client’s vision into a rigorous, actionable requirements specification and a phased technical implementation plan.

This document serves two primary functions:

1. **Requirements Engineering Guide** – providing a methodology to extract, clarify, and prioritize the client’s needs, ensuring that implicit assumptions about auction access, logistics, and compliance are surfaced and validated.  
2. **Technical Blueprint** – detailing the architecture, data schemas, and process flows required to build the five core modules:
   - Auction  
   - Yard  
   - Logistics  
   - Finance  
   - Compliance  

The analysis synthesizes data from over 100 research sources, covering:
- Japanese auction houses (USS, JAA)
- Import regulations of key markets (Sri Lanka, Botswana)
- Financial engineering for Consumption Tax refunds

By adopting a microservices-based architecture and an agile implementation roadmap, the proposed system aims to deliver scalability and resilience in the volatile international automotive trade landscape.

---

## 2. Requirements Engineering Methodology

Building an ERP for a specialized domain like vehicle export requires a structured, consultative approach to requirements gathering. The primary risk lies in the gap between *vision* and *technical specification*.

### 2.1 Elicitation Strategy: From Vision to Specification

We convert the client’s outline and voice notes into structured **user stories** using a **Process-Driven Elicitation** approach.

**Golden Path Mapping**:  
Track a single vehicle from:
- Auction listing  
- Purchase  
- Yard entry  
- Export  
- Customs clearance  

This exposes hidden requirements that simple interviews miss.

**Example (Auction Module)**:
- Proxy bidding support
- Bid increment logic
- Real-time synchronization with auction servers (USS)

#### 2.1.1 Surfacing Implicit Assumptions

Common assumptions in JUV exports include:

- **Data Access**  
  Auction access is often assumed to be via open APIs. In reality, USS/JAA require membership, VPNs, or aggregators.

- **Regulatory Staticity**  
  Import rules change frequently (e.g., Sri Lanka LC changes in 2025).

- **Financial Flow**  
  Profit is not just buy vs sell price—Consumption Tax and Recycle Ticket refunds are core margins.

**Constraint Analysis Questions**:
- What happens if the auction API fails mid-bid?
- What if JAAI inspection fails after vanning?
- How does the system handle retroactive duty changes?

---

### 2.2 Prioritization and Risk Assessment (MoSCoW & RICE)

We use:
- **MoSCoW** for scope control  
- **RICE** for feature-level ranking  

| Feature Area | Priority | RICE | Justification |
|-------------|---------|------|---------------|
| Auction Data Aggregation | Must Have | High | Foundational inventory input |
| Proxy Bidding Engine | Should Have | Medium | High impact, high latency risk |
| Consumption Tax Ledger | Must Have | High | Core to cash flow |
| Mobile Yard App | Should Have | Medium | Improves accuracy |
| AI Damage Detection | Could Have | Low | High effort, low MVP value |

---

### 2.3 Communication and Ambiguity Resolution Plan

To avoid client fatigue:

- **Batching**: Weekly module-wise clarification decks  
- **Visual Aids**: Wireframes and flowcharts  
- **Decision Log**: Living backlog with date and owner  

---

## 3. Technical Implementation: Module-by-Module Analysis

### 3.1 Auction Module: Procurement and Data Intelligence

Purpose:
- Aggregate listings from 100+ auction houses
- Normalize data
- Enable bidding

#### 3.1.1 Data Aggregation Strategy

**Implementation Options**:

1. **Authorized Aggregators (ASNET, OtoFacts)**  
   - Pros: Legal, stable, multi-house access  
   - Cons: Latency, cost  

2. **Direct CIS Connection (USS)**  
   - Requires physical presence and guarantors  

3. **Scraping (Not Recommended)**  
   - High legal risk under Japanese law  

**Data Normalization**:
- Map auction sheets to a unified `Vehicle_Condition` schema
- Normalize grading (USS vs TAA) to an internal standard

---

#### 3.1.2 Auction Sheet Digitization (OCR & Translation)

**Pipeline**:
1. Image preprocessing (OpenCV)
2. OCR (Japanese handwriting models)
3. Diagram parsing (A1, U2, XX)
4. Translation using dictionaries + LLMs

---

#### 3.1.3 Proxy Bidding Architecture

- **Backend**: Golang / Node.js  
- **Communication**: WebSockets  
- **Logic**:
  - User sets `Max_Bid`
  - Agent bids incrementally until max
- **Latency Requirement**: Server must be hosted in Japan

---

### 3.2 Yard Module: Physical Inventory and Processing

#### 3.2.1 Inbound Logistics and Gate-In

- Auto-generate transport orders
- VIN scan verification
- Secondary inspection for transit damage

---

#### 3.2.2 Mobile Yard Application

- **Tech**: React Native / Flutter  
- **Features**:
  - Guided photo capture (AR overlays)
  - QR-based location tracking
  - Offline-first sync

---

#### 3.2.3 Vanning Optimization

- **Container Types**: 40ft HC  
- **Methods**: Racking, Hanging  
- **Algorithm**: 3D Bin Packing / Knapsack  
- **APIs**: EasyCargo, MaxLoad Pro  

---

## 3.3 Logistics Module: Global Shipping and Documentation

### 3.3.1 Booking Management

- Support for:
  - Direct shipping lines (MBL)
  - Forwarders (HBL)
- EDI support (EDIFACT / ANSI X12)

---

### 3.3.2 Documentation Engine

Auto-generate:
- Export Certificate
- Commercial Invoice
- Packing List
- BL Instructions

---

### 3.3.3 Hazardous Goods Compliance (IMDG)

- Gas free confirmation
- Battery disconnection
- Block gate-out if non-compliant

---

## 3.4 Finance Module: Profitability and Cash Flow

### 3.4.1 Cost Structures (FOB vs CIF)

Dynamic price build-up:
- FOB = Vehicle + Fees + Inland + Vanning
- CIF = FOB + Freight + Insurance

---

### 3.4.2 Consumption Tax Refund Ledger

- Track tax paid vs recoverable
- Generate NTA export proof

---

### 3.4.3 Recycle Ticket Refund

- Track ticket number
- Auto-generate JARC claims

---

### 3.4.4 Letter of Credit (LC) Management

- Sight vs Usance
- Sri Lanka 2025 rule enforcement
- Auto discrepancy checks

---

## 3.5 Compliance Module: Regulatory Gatekeeper

### 3.5.1 PSI Integration

- Country-based inspection rules
- API integration (JEVIC, QISJ, EAA)

---

### 3.5.2 Destination Rules Engine

Rules stored as JSON logic (Drools / JSON-Logic).

| Country | Rule | Logic |
|------|------|------|
| Sri Lanka | Max age 3 years | Block if exceeded |
| Botswana | No age limit | Allow |
| USA | 25-year rule | Block if <25 |
| Global | Radiation | Require cert |

---

### 3.5.3 Sanctions & Security

- Denied party screening
- Stolen vehicle verification

---

## 4. Phased Project Plan

### Phase 1: Core MVP (Months 1–4)
- Auction integration
- Vehicle master
- Yard inventory
- FOB invoicing

### Phase 2: Logistics & Compliance (Months 5–8)
- Shipping & BL
- Rules engine
- Document automation
- Tax logic

### Phase 3: Digital Operations (Months 9–12)
- Mobile yard app
- Proxy bidding
- OCR
- LC management

### Phase 4: Optimization & Scale (Month 13+)
- Vanning optimization
- Analytics
- Customer portal

---

## 5. Communication & Documentation Artifacts

### 5.1 Weekly Clarification Deck

1. Context  
2. Process Diagram  
3. Ambiguity  
4. Recommendation  

---

### 5.2 Requirements Backlog Template

| ID | Module | Feature | User Story | Priority | Risk | Status | Assumption |
|----|-------|--------|------------|---------|------|--------|------------|
| AUC-01 | Auction | Proxy Bidding | Auto-bid to max | SHOULD | High | Analysis | API latency |
| LOG-05 | Logistics | BL Surrender | Mark BL surrendered | MUST | Low | Ready | Fee payer |

---

## 6. Technical Architecture & Database Design

### 6.1 Database Schema (PostgreSQL)

**vehicles**
- id (UUID, PK)
- chassis_number (Unique)
- make, model
- manufacture_year_month
- engine_cc
- fuel_type
- auction_grade
- buy_price
- consumption_tax
- recycle_fee
- location_status

**shipments**
- id (UUID)
- booking_reference
- vessel_name
- etd / eta
- shipping_line
- type
- bill_of_lading_number

**compliance_rules**
- id
- country_code
- rule_type
- logic_json (JSONB)
- active

---

### 6.2 Infrastructure (Cloud-Native)

- **Compute**: AWS ECS / Kubernetes  
- **Storage**: S3  
- **Queue**: RabbitMQ / SQS  

**Event Flow Example**:
- Vehicle won → queue event
  - Finance creates invoice
  - Logistics creates transport order
  - Notification emails customer

---

## 7. Conclusion

This report defines a rigorous path to building a world-class Vehicle Import/Export ERP. By embracing the domain’s realities—auction data constraints, regulatory rigidity, and tax-driven profitability—the system delivers real competitive advantage.

Next Step: **Phase 1 Discovery** – validate auction data access and finalize MVP scope.

---

## 8. References

- **Auction Data**: USS, ASNET, OtoFacts  
- **Compliance**: Sri Lanka Import Rules, Botswana Rules, JEVIC  
- **Finance**: Consumption Tax, Recycling Ticket, Letter of Credit  
- **Technology**: WebSockets, OCR, Yard Management


---

### Module C: Golden Record Vehicle Database

**REQ-1.5 – Single Source of Truth**
Each vehicle record must persist:
- Commercial data (purchase & sales invoices)
- Technical data (engine CC, fuel type, manufacture date)
- Media (minimum 20 HD photos)

Manufacture date is mandatory due to age-based import rules.

---

## 9.4 Phase 2: Compliance & Logistics Engine
**Timeline:** Months 4–6  
**Objective:** Control physical movement and regulatory risk

---

### Module D: Yard Operations & Mobile App

**REQ-2.1 – Yard Mobile App**
- Cross-platform (React Native)
- VIN OCR scanning
- Guided photo capture with enforced angles

**REQ-2.2 – Repair & Work Orders**
- Yard logs defect
- Sales approves cost
- Repair completed with “after” photo
- Vehicle cannot reach `READY_TO_SHIP` with open work orders

---

### Module E: Compliance Gatekeeper

**REQ-2.3 – Destination Rules Engine**

| Country | Rule |
|------|------|
| Sri Lanka | Block if age > 3 years |
| Sri Lanka | Block Usance LC (2025 regulation) |
| Botswana | JEVIC inspection mandatory |

Rules must be **config-driven**, not hard-coded.

**REQ-2.4 – Inspection Booking Automation**
System auto-triggers inspection requests (JEVIC / JAAI / QISJ) based on destination.

---

## 9.5 Phase 3: Financial Engineering
**Timeline:** Months 7–9  
**Objective:** Automate recoverable profit and protect cash flow

---

### Module F: Tax & Refund Ledger

**REQ-3.1 – Consumption Tax Automation**
- Record 10% input tax at purchase
- Validate export via shipment confirmation
- Generate refund-ready reports for NTA

**REQ-3.2 – Recycle Ticket Refund**
- Persist Recycle Ticket Number
- Generate JARC refund claim upon shipment

---

### Module G: Letter of Credit (LC) Manager

**REQ-3.3 – LC Discrepancy Scrubber**
- OCR LC documents
- Validate ETD vs LC latest shipment date
- Auto-alert on mismatch to prevent bank rejection

---

## 9.6 Phase 4: Optimization & Scale
**Timeline:** Month 10+  
**Objective:** Volume scaling and operational intelligence

---

### Module H: Vanning Optimization

**REQ-4.1 – Container Load Planning**
- Input: vehicle dimensions
- Output: optimized container plan
- Supports R-Rak stacking
- Target: reduce per-unit freight cost from ~$1000 → ~$800

---

### Module I: Advanced Auction Bot

**REQ-4.2 – Proxy Bidding**
- User sets max budget
- System bids automatically in ¥3,000 increments
- Requires Japan-region deployment for latency control

---

## 9.7 End-to-End “Happy Path” (Operational Story)

1. Customer (Botswana) bids $4,500
2. System validates compliance (no age limit)
3. Sales approves margin
4. Auction team purchases vehicle
5. Transport auto-booked to yard
6. Yard scans VIN, captures photos, logs defect
7. Sales resolves defect
8. Finance logs recoverable tax
9. Inspection booked and passed
10. Shipping booked
11. Documents auto-generated
12. Customer sees **Status: Shipped**

---

## 9.8 Risk Controls Embedded in the System

| Risk | Industry Reality | System Enforcement |
|---|---|---|
| Sri Lanka LCs | Usance banned (2025) | Hard block |
| Yard theft | Common | Entry/exit photo comparison |
| FX volatility | Margin erosion | Rate frozen at invoice |
| Auction access | Closed networks | Aggregator-only integration |

---

## 9.9 Core Database Entity (Reference)

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY,
    chassis_number VARCHAR(20) UNIQUE,
    auction_grade VARCHAR(5),
    status ENUM('BIDDING','WON','YARD','INSPECTION','SHIPPED'),
    destination_country_code CHAR(2),

    purchase_price_jpy DECIMAL,
    consumption_tax_jpy DECIMAL,
    recycle_fee_jpy DECIMAL,

    vanning_container_id UUID,
    inspection_cert_number VARCHAR,

    is_radiation_checked BOOLEAN DEFAULT FALSE,
    is_batteries_disconnected BOOLEAN DEFAULT FALSE
);
