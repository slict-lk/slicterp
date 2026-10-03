// PHASE 2: Point of Sale Module Types

export interface POSSession {
  id: string;
  name: string;
  posConfigId: string;
  userId: string;
  startDate: Date;
  endDate?: Date;
  openingCash: number;
  closingCash?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface POSConfig {
  id: string;
  name: string;
  warehouseId: string;
  allowDiscount: boolean;
  maxDiscount?: number;
  receiptHeader?: string;
  receiptFooter?: string;
}

export interface POSOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod?: string;
  notes?: string;
  items: POSOrderItem[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface POSOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface POSPayment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  reference?: string;
}

export interface CashRegister {
  sessionId: string;
  openingBalance: number;
  sales: number;
  returns: number;
  expenses: number;
  expectedBalance: number;
  actualBalance?: number;
  difference?: number;
}
