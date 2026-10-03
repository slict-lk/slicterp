# Personal Data Protection Act

**Status: Secondary.** From research papers and professional commentary, checked 21–29 September
2026. Read the [Act](https://www.dpa.gov.lk/acts/Data%20Protection%20Act%20SL%20-%20English%20(2).pdf)
and the [Data Protection Authority](https://www.dpa.gov.lk/) guidance before treating any of this
as settled. Obligations for a multi-tenant SaaS need a lawyer's reading.

## Timing

- Personal Data Protection Act No. 9 of 2022, as amended by Act No. 22 of 2025.
- Core controller duties take effect **1 January 2027**.
- As of September 2026, one research paper reports **no commencement order** for Part II
  (data-subject rights, ss.13–19), Part IV (s.27) or Part VII (penalties, ss.38–39), so the
  rights and fines are not yet enforceable. **Unverified.** It is a design constraint for early
  2027, not an emergency.

## Relevant to SLICT

- **Health data is a special category.** The healthcare module stores `Patient`, `Prescription`
  and `Admission` records. Section 20(1), as amended, reportedly makes a Data Protection Officer
  mandatory for significant processing of special categories. DPO registration with the
  Authority is reported as voluntary for now.
- **Controller or processor.** SLICT is likely a processor for its tenants' customer data and a
  controller for its own users. The two roles carry different contract terms.
- **Data-subject requests.** Commentary on the original Act gives 21 business days to respond.
  SLICT has no export, correction or erasure capability yet.
- **Cross-border transfer.** Production (Aiven, Vercel) and Lark keep data outside Sri Lanka.

## Engineering rules, from now

- No personal data in logs, error messages, Lark messages or test fixtures. Use synthetic data.
- Record access to personal data. `logAudit()` in `src/lib/audit.ts` exists but has **zero
  callers**; wire it in rather than building another.
- Never send production personal data to a cloud AI service in testing. Use the local model
  (`pnpm verify -- --with-ai`, PR #3).
