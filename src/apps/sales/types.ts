// Sales & CRM canonical + compatibility types

export type SalesOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'DELIVERED'
  | 'INVOICED'
  | 'CLOSED'
  | 'CANCELLED';

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CONVERTED';

export interface SalesDocumentLine {
  id: string;
  productId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  subtotal?: number;
  total?: number;
}

export interface SalesQuote {
  id: string;
  quoteNumber: string;
  customerAccountId?: string;
  opportunityId?: string;
  status: QuoteStatus | string;
  currency: string;
  validUntil?: Date | string;
  subtotal: number;
  taxTotal?: number;
  discountTotal?: number;
  grandTotal: number;
  termsAndConditions?: string;
  notes?: string;
  lines: SalesDocumentLine[];
}

export interface SalesOrderV2 {
  id: string;
  orderNumber: string;
  customerAccountId?: string;
  sourceQuoteId?: string;
  status: SalesOrderStatus | string;
  approvalStatus?: string;
  fulfillmentStatus?: string;
  invoiceStatus?: string;
  currency: string;
  orderDate: Date | string;
  expectedDeliveryDate?: Date | string;
  subtotal: number;
  taxTotal?: number;
  discountTotal?: number;
  grandTotal: number;
  notes?: string;
  lines: SalesDocumentLine[];
}

// Compatibility exports used by existing UI/components
export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED' | string;
  customerId: string;
  orderDate: Date;
  deliveryDate?: Date;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  lines: SalesOrderLine[];
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: 'NEW' | 'QUALIFIED' | 'PROPOSITION' | 'WON' | 'LOST' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  expectedRevenue?: number;
  probability?: number;
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'INDIVIDUAL' | 'COMPANY' | string;
  taxId?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | string;
  customerId: string;
  validUntil: Date;
  subtotal: number;
  tax: number;
  total: number;
}

