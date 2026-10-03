# Social Security Contribution Levy

**Status: Unresolved.** Do not change SSCL calculations until a chartered accountant has confirmed
the rules against the [IRD's SSCL page](https://www.ird.gov.lk/en/type%20of%20taxes/sitepages/social%20security%20contribution%20levy%20(sscl).aspx?menuid=1207)
and the SSCL Act No. 25 of 2022 with its amendments.

- **Rate:** 2.5% of liable turnover. Both research sources agree.
- **Registration threshold:** the sources **conflict**.
  - Compliance register: Rs. 15 million per quarter, or Rs. 60 million over the prior 12 months.
  - Gemini research: Rs. 9 million per quarter, or Rs. 36 million over four quarters, from 1 July 2026.
  - Both are sourced to secondary material.
- **Calculation base:** `src/lib/taxCalculator.ts` computes VAT on (value + SSCL). Its comments
  show the author was unsure of this ("Let's verify standard SSCL base"). It is unverified.
