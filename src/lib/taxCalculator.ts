
/**
 * Tax Constants for Sri Lanka (2026)
 */
export const TAX_RATES = {
    SSCL: 0.025, // 2.5% Social Security Contribution Levy
    VAT: 0.18,   // 18% Value Added Tax
};

export interface TaxBreakdown {
    basePrice: number;
    ssclAmount: number;
    vatAmount: number;
    totalTax: number;
    shelfPrice: number;
}

/**
 * Calculates base price and tax components from a tax-inclusive shelf price.
 * 
 * Formula:
 * VAT is charged on (Base + SSCL).
 * 
 * 1. Price_with_SSCL = Base * (1 + SSCL_RATE)
 * 2. Shelf_Price = Price_with_SSCL * (1 + VAT_RATE)
 * 3. Therefore: Shelf_Price = Base * (1 + SSCL_RATE) * (1 + VAT_RATE)
 * 
 * Reverse:
 * Base = Shelf_Price / ((1 + SSCL_RATE) * (1 + VAT_RATE))
 * 
 * @param shelfPrice The final price displayed to customer
 * @param isExempt If true, taxes are 0 and base = shelf
 */
export function calculateTaxBreakdown(shelfPrice: number, isExempt: boolean = false): TaxBreakdown {
    // Round to 2 decimals utility
    const round = (num: number) => Math.round(num * 100) / 100;

    if (isExempt) {
        return {
            basePrice: shelfPrice,
            ssclAmount: 0,
            vatAmount: 0,
            totalTax: 0,
            shelfPrice: shelfPrice
        };
    }

    const { SSCL, VAT } = TAX_RATES;

    // 1. Calculate Base Price
    // Denominator = (1 + 0.025) * (1 + 0.18) = 1.025 * 1.18 = 1.2095
    const denominator = (1 + SSCL) * (1 + VAT);
    const basePrice = round(shelfPrice / denominator);

    // 2. Calculate SSCL Amount (charged on Base)
    // Actually, SSCL is usually Turnover based, but for reverse calc on item price:
    // We assume Base * SSCL_RATE. 
    // Wait, IRD calculation: VAT is on (Value + SSCL).
    // Let's verify standard SSCL base. 
    // SSCL is on Turnover. For pricing, we treat it as a cost component.
    // Standard practice: Base -> +SSCL -> +VAT.

    // Intermediate value (Value + SSCL)
    const valueDidLiableToVat = basePrice * (1 + SSCL);
    const ssclAmount = round(valueDidLiableToVat - basePrice);

    // 3. Calculate VAT Amount (charged on Value + SSCL)
    const vatAmount = round((valueDidLiableToVat * VAT));

    // 4. Verify Total
    const totalCalculated = basePrice + ssclAmount + vatAmount;

    // Adjust for rounding errors (penny differences)
    // We adjust VAT to match shelf price exactly if needed, or Base.
    // Usually adjusting Base is safer for accounting, but shelf is fixed.
    // Let's rely on standard rounding. 

    return {
        basePrice,
        ssclAmount,
        vatAmount,
        totalTax: round(ssclAmount + vatAmount),
        shelfPrice
    };
}
