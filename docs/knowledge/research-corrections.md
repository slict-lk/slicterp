# Research corrections

**Status: Verified.** The September 2026 research was checked against primary sources and the
code. Where it disagrees with this list, this list wins.

| Claim in the research | What is true | Evidence |
| --- | --- | --- |
| The VAT invoice format is Gazette 2463/05, from 1 April 2026 | Superseded by 2481/22; mandatory from **1 October 2026** under 2500/106 | [vat-tax-invoice.md](vat-tax-invoice.md) |
| Format mandatory from 1 July 2026 | Moved to 1 October by Gazette 2500/106. The circular was never updated, which is why sources disagree | Gazette 2500/106, read in full |
| RAMIS transmission is needed for 1 October | Optional; its approval window closed on 1 July 2026 | Circular SEC/2026/E/03 s.4.4 |
| `QQQQ` is four characters | 1 to 15 letters or digits | Circular s.4.4 |
| PDPA fines apply from January 2027 | Penalty provisions reportedly have no commencement order yet | [pdpa.md](pdpa.md), Secondary |
| One SSCL threshold | Two conflicting thresholds, both from secondary sources | [sscl.md](sscl.md) |
| Routes are unauthenticated because there is no `middleware.ts` | Next.js 16 renamed Middleware to Proxy, and `src/proxy.ts` gates every route except `/api/public/*`. But Next.js documents that Proxy is not a full authorization layer, so per-route session checks are still required | `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` |
| Manus `offline-sync.ts` is ready to use | It reads and writes the invoice counter in separate transactions, so simultaneous sales get duplicate numbers, and its numbers don't match `YYMMM_QQQQ_XXXXX` | Code review, 21 September |
| Manus WhatsApp `route.ts` | Correct: verifies the HMAC before parsing, compares in constant time, fails closed | Code review, 21 September |
| gitleaks will catch leaked credentials | Its default rules missed this repository's real leak. `.gitleaks.toml` adds the needed rules (PR #3) | PR #3 |
