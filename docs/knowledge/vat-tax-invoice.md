# VAT tax invoice format

**Status: Verified** on 29 September 2026. Gazette 2500/106 and Circular SEC/2026/E/03 were read
in full. Gazette 2481/22 itself has not been read; the circular explains it.

## The rule and its date

Every VAT-registered person must issue tax invoices in the prescribed format from
**1 October 2026**.

| Date | Instrument | Effect |
| --- | --- | --- |
| 17 Nov 2025 | [Gazette 2463/05](https://www.ird.gov.lk/en/publications/Gazette_Documents/2025_2463-05_E.pdf) | First format. **Superseded, do not implement** |
| 27 Mar 2026 | [Gazette 2481/22](https://www.ird.gov.lk/en/publications/Gazette_Documents/2026_2481-22_E.pdf) | The format in force |
| 20 May 2026 | [Circular SEC/2026/E/03](https://www.ird.gov.lk/en/publications/Circulars_Circulars/SEC_2026_E_03_E.pdf) | Explains each requirement. **Still says 1 July: outdated** |
| 6 Aug 2026 | [Gazette 2500/106](https://www.ird.gov.lk/en/publications/Gazette_Documents/2026_2500_106_E.pdf) | Moves the start to 1 October 2026; "all other matters shall remain unchanged" |

The deadline moved four times. Before relying on the date, check the IRD's
[notices](https://www.ird.gov.lk/en/SitePages/Default.aspx) for anything newer than 2500/106.

## Mandatory content (Circular s.4)

- The words **TAX INVOICE**, prominently.
- **Supplier:** TIN (9 digits), name and address, exactly as on the VAT registration certificate.
- **Purchaser, if VAT-registered:** TIN, name and address, as on their certificate.
- **Serial number** `YYMMM_QQQQ_XXXXX`, described below.
- **Invoice date** and **date of supply**, as two separate fields. The date of supply decides the VAT period.
- **Description** of each item, specific enough to identify it. Never "items", "products", "services" or "miscellaneous".
- **Quantity**, in measurable units.
- **Value excluding VAT**, **VAT amount**, and **total including VAT**, in LKR to two decimal places.
- **Foreign currency** only with Central Bank approval, plus those three values in LKR at the CBSL selling rate on the invoice date.
- **Only VAT-liable supplies.** An exempt supply that is an integral part of a taxable one may be shown separately.

Optional: payment mode, place of supply, amount in words, notes. The layout is free (logo,
extra columns) as long as every mandatory element is clearly identifiable.

## Serial number `YYMMM_QQQQ_XXXXX`

| Part | Rule |
| --- | --- |
| `YY` | The year, e.g. `26`. The circular's text says "1st two digits", but its own example gives `26` for 2026. Follow the example |
| `MMM` | First three letters of the month in English capitals, e.g. `OCT`. Never locale month names (en-GB gives "Sept") |
| `QQQQ` | Classification code chosen by the business (branch, device, invoice type): **1 to 15** letters or digits |
| `XXXXX` | Digits only, **continuing from the last invoice issued**. It may restart at a new month or year only for reasons beyond the business's control |

The whole number has no spaces and at most 40 characters.

## Engineering rules

- Compute every tax date in **Asia/Colombo**, never server time. Servers run on UTC, 5 h 30 m behind.
- Key the sequence on tenant and `QQQQ`. **Never reset it monthly**: `YYMMM` is a date stamp, not a partition.
- Assign the number **inside the transaction that creates the invoice**, after every check that can reject it, so a rollback gives the number back.
- Invoice numbers are unique **per tenant**, not globally.
- Implementation: `src/lib/tax-invoice/` (PR #2).

## Consequences of non-compliance (Circular s.7)

Rejection of the invoice for input VAT credit, inconsistent VAT returns, more audit scrutiny, and
possible penalties under the VAT Act. The purchaser loses their input VAT claim first.

## Not required on 1 October

Sending invoices to RAMIS is an **optional** route. A registered person who obtained
Commissioner-General approval **before 1 July 2026**, and integrates by 31 December 2026, may drop
the `YYMMM_QQQQ_` prefix. That window has closed. See [ramis-web-api.md](ramis-web-api.md).

## Open

- The printed date format. A specialist summary reports MM/DD/YYYY; the circular does not say. Check Gazette 2481/22 before printing dates.
- Accountant sign-off on the continuity reading and on "a TIN on file means VAT-registered".
