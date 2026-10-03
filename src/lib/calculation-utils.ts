/**
 * Business Calculation Utilities
 * Common calculations for ERP operations
 */

// Calculate line total with discount and tax
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discount: number = 0,
  tax: number = 0
): number {
  const subtotal = quantity * unitPrice;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * tax) / 100;
  return afterDiscount + taxAmount;
}

// Calculate invoice/order totals
export interface LineItem {
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface TotalsBreakdown {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
}

export function calculateTotals(lines: LineItem[]): TotalsBreakdown {
  const subtotal = lines.reduce((sum, line) => {
    return sum + line.quantity * line.unitPrice;
  }, 0);

  const totalDiscount = lines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice;
    return sum + (lineSubtotal * (line.discount || 0)) / 100;
  }, 0);

  const totalTax = lines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice;
    const afterDiscount = lineSubtotal - (lineSubtotal * (line.discount || 0)) / 100;
    return sum + (afterDiscount * (line.tax || 0)) / 100;
  }, 0);

  const total = subtotal - totalDiscount + totalTax;

  return { subtotal, totalDiscount, totalTax, total };
}

// Calculate profit margin
export function calculateMargin(
  sellingPrice: number,
  costPrice: number
): { margin: number; marginPercentage: number } {
  const margin = sellingPrice - costPrice;
  const marginPercentage = costPrice > 0 ? (margin / costPrice) * 100 : 0;
  
  return { margin, marginPercentage };
}

// Calculate markup
export function calculateMarkup(
  sellingPrice: number,
  costPrice: number
): { markup: number; markupPercentage: number } {
  const markup = sellingPrice - costPrice;
  const markupPercentage = costPrice > 0 ? (markup / costPrice) * 100 : 0;
  
  return { markup, markupPercentage };
}

// Calculate discount amount
export function calculateDiscountAmount(
  amount: number,
  discountPercentage: number
): number {
  return (amount * discountPercentage) / 100;
}

// Calculate tax amount
export function calculateTaxAmount(
  amount: number,
  taxPercentage: number
): number {
  return (amount * taxPercentage) / 100;
}

// Calculate price with tax
export function calculatePriceWithTax(
  price: number,
  taxPercentage: number
): number {
  return price + calculateTaxAmount(price, taxPercentage);
}

// Calculate price before tax
export function calculatePriceBeforeTax(
  priceWithTax: number,
  taxPercentage: number
): number {
  return priceWithTax / (1 + taxPercentage / 100);
}

// Calculate compound interest
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  frequency: number = 1
): number {
  return principal * Math.pow(1 + rate / (100 * frequency), frequency * time);
}

// Calculate simple interest
export function calculateSimpleInterest(
  principal: number,
  rate: number,
  time: number
): number {
  return (principal * rate * time) / 100;
}

// Calculate weighted average
export function calculateWeightedAverage(
  values: number[],
  weights: number[]
): number {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length');
  }

  const weightedSum = values.reduce(
    (sum, value, index) => sum + value * weights[index],
    0
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// Calculate percentage change
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// Calculate average
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

// Calculate median
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Calculate standard deviation
export function calculateStandardDeviation(values: number[]): number {
  const avg = calculateAverage(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// Calculate conversion rate
export function calculateConversionRate(
  conversions: number,
  total: number
): number {
  return total > 0 ? (conversions / total) * 100 : 0;
}

// Calculate ROI (Return on Investment)
export function calculateROI(
  gain: number,
  cost: number
): { roi: number; roiPercentage: number } {
  const roi = gain - cost;
  const roiPercentage = cost > 0 ? (roi / cost) * 100 : 0;
  
  return { roi, roiPercentage };
}

// Calculate break-even point
export function calculateBreakEven(
  fixedCosts: number,
  variableCostPerUnit: number,
  pricePerUnit: number
): number {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  return contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
}

// Calculate inventory turnover
export function calculateInventoryTurnover(
  costOfGoodsSold: number,
  averageInventory: number
): number {
  return averageInventory > 0 ? costOfGoodsSold / averageInventory : 0;
}

// Calculate days in inventory
export function calculateDaysInInventory(
  inventoryTurnover: number
): number {
  return inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;
}

// Calculate gross profit
export function calculateGrossProfit(
  revenue: number,
  costOfGoodsSold: number
): { grossProfit: number; grossProfitMargin: number } {
  const grossProfit = revenue - costOfGoodsSold;
  const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  
  return { grossProfit, grossProfitMargin };
}

// Calculate net profit
export function calculateNetProfit(
  revenue: number,
  totalExpenses: number
): { netProfit: number; netProfitMargin: number } {
  const netProfit = revenue - totalExpenses;
  const netProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  return { netProfit, netProfitMargin };
}

// Calculate CAGR (Compound Annual Growth Rate)
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  years: number
): number {
  if (beginningValue <= 0 || years <= 0) return 0;
  return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
}

// Round to decimal places
export function roundToDecimal(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Format currency
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

// Format percentage
export function formatPercentage(
  value: number,
  decimals: number = 2
): string {
  return `${roundToDecimal(value, decimals)}%`;
}

// Calculate payment schedule
export interface PaymentScheduleItem {
  installment: number;
  amount: number;
  dueDate: Date;
  principal: number;
  interest: number;
  balance: number;
}

export function calculatePaymentSchedule(
  principal: number,
  annualRate: number,
  months: number,
  startDate: Date = new Date()
): PaymentScheduleItem[] {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  let balance = principal;
  const schedule: PaymentScheduleItem[] = [];

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    balance -= principalPayment;

    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);

    schedule.push({
      installment: i,
      amount: monthlyPayment,
      dueDate,
      principal: principalPayment,
      interest,
      balance: Math.max(0, balance),
    });
  }

  return schedule;
}
