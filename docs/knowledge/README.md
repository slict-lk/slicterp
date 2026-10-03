# Knowledge base

Domain facts that Claude Code and Antigravity must get right when writing SLICT code. Each file
states where every fact comes from and when it was checked.

| Status | Meaning | How agents treat it |
| --- | --- | --- |
| **Verified** | Checked against a primary source (gazette, act, regulator document) on the date shown | A rule. Code must follow it |
| **Secondary** | From research papers or professional summaries only | Guidance. Confirm before building on it |
| **Unresolved** | Sources conflict | Do not implement. Flag it and ask |

| File | Status | Covers |
| --- | --- | --- |
| [vat-tax-invoice.md](vat-tax-invoice.md) | Verified | The mandatory VAT tax invoice format, from 1 October 2026 |
| [ramis-web-api.md](ramis-web-api.md) | Verified | Sending invoices to the IRD's RAMIS system |
| [pdpa.md](pdpa.md) | Secondary | Personal Data Protection Act obligations |
| [payments-sri-lanka.md](payments-sri-lanka.md) | Secondary | Payment gateways and recurring billing |
| [sscl.md](sscl.md) | Unresolved | Social Security Contribution Levy |
| [payroll-statutory.md](payroll-statutory.md) | Secondary | EPF, ETF, APIT, gratuity. SLICT has no payroll module yet |
| [research-corrections.md](research-corrections.md) | Verified | What the September 2026 research got wrong |

## Adding a fact

Give the primary source and the date you checked it. A claim from a research paper is
**Secondary** until someone reads the instrument itself. Tax and statutory calculations also
need a chartered accountant's sign-off before they ship. Never write a secret's value here,
not even to describe a leak: give its location.
