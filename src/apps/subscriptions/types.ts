// PHASE 2: Subscription Management Module Types

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'USAGE_BASED';
  price: number;
  trialDays: number;
  features: Record<string, any>;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  planId: string;
  customerId: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  invoiceId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  amount: number;
  status: string;
}

export interface UsageRecord {
  id: string;
  subscriptionId: string;
  metric: string;
  quantity: number;
  timestamp: Date;
}

export interface SubscriptionMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;
  ltv: number; // Lifetime Value
  activeSubscriptions: number;
  trialConversionRate: number;
}
