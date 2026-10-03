// Accounting & Finance Module Types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  type: 'SALES' | 'PURCHASE';
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  lines: InvoiceLine[];
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: Date;
  method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'PAYPAL' | 'STRIPE' | 'OTHER';
  reference?: string;
  invoiceId: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  currency: string;
  balance: number;
  parentId?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: Date;
  employeeId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  receipt?: string;
  notes?: string;
}
