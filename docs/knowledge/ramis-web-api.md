# RAMIS Web API for invoices

**Status: Verified** on 29 September 2026, from the IRD's
[VAT Web API Quick Guide v0.1](https://www.ird.gov.lk/en/eServices/Lists/FilingReturns/Attachments/17/VAT_WEB_API_Quick_Guide_v0_1.pdf).
**Not required** for the 1 October 2026 invoice format. See [vat-tax-invoice.md](vat-tax-invoice.md).

## How it works

1. The supplier authenticates with its SSID and password and receives a JWT.
2. Invoices flow through Web API → message queue → listener → RAMIS.
3. RAMIS records each invoice automatically:
   - a tax invoice in the supplier's **Schedule 1** (output VAT) and the purchaser's **Schedule 2** (input VAT)
   - a credit or debit note in both parties' **Schedule 4**
   - a zero-rated service export in the supplier's **Schedule 7**
4. The supplier's record shows *Pending Match*. The purchaser reviews it (*Pending Approval*), may
   adjust disallowed VAT or move it to a later period, and approves it, which makes it *Matched*.
   Bulk approval is capped at 5,000 records.

## What matters for SLICT

- **Records submitted through the API cannot be edited or deleted in the e-Service UI.** Validate
  every invoice fully *before* submission.
- As a supplier's ERP, SLICT would submit. As a purchaser's ERP, SLICT would reconcile Schedule 2
  against accounts payable.
- The circular names "API-based reporting" as an objective, so this is where Sri Lankan VAT is heading.
