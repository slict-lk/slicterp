// Spare Parts Shop Module - Type Definitions

export interface ShopCustomer {
    id: string;
    customerNumber: string;
    name: string;
    email: string | null;
    phone: string;
    alternatePhone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    businessName: string | null;
    taxId: string | null;
    customerType: 'RETAIL' | 'WHOLESALE' | 'MECHANIC' | 'FLEET' | 'VIP';
    creditLimit: number;
    creditBalance: number;
    paymentTermDays: number;
    loyaltyPoints: number;
    totalPurchases: number;
    tenantId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ShopCustomerVehicle {
    id: string;
    customerId: string;
    make: string;
    model: string;
    year: number;
    plateNumber: string | null;
    vin: string | null;
    createdAt: Date;
}

export interface ShopInvoice {
    id: string;
    invoiceNumber: string;
    customerId: string | null;
    customer?: ShopCustomer | null;
    customerName: string | null;
    customerPhone: string | null;
    vehicleInfo: string | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
    paidAmount: number;
    dueAmount: number;
    status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'OVERDUE';
    notes: string | null;
    internalNotes: string | null;
    items: ShopInvoiceItem[];
    payments: ShopInvoicePayment[];
    createdById: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ShopInvoiceItem {
    id: string;
    invoiceId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    discountPercent: number;
    discountAmount: number;
    promotionId: string | null;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    vehicleInfo: string | null;
}

export interface ShopInvoicePayment {
    id: string;
    invoiceId: string;
    amount: number;
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'MOBILE_PAYMENT';
    reference: string | null;
    receivedById: string;
    createdAt: Date;
}

export interface ShopPromotion {
    id: string;
    name: string;
    description: string | null;
    code: string | null;
    type: 'AUTOMATIC' | 'CODE' | 'COUPON';
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
    discountValue: number;
    minimumPurchase: number | null;
    maximumDiscount: number | null;
    usageLimit: number | null;
    usageCount: number;
    perCustomerLimit: number | null;
    targetType: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES' | 'SPECIFIC_BRANDS';
    targetCategories: string[];
    targetBrands: string[];
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    priority: number;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ShopCustomerAudience {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    rules: Record<string, unknown> | null;
    isAutomatic: boolean;
    tenantId: string;
    createdAt: Date;
}

export interface ShopReorderRule {
    id: string;
    productId: string | null;
    categoryId: string | null;
    reorderPoint: number;
    reorderQuantity: number;
    maxStock: number | null;
    useDemandForecast: boolean;
    demandPeriodDays: number;
    safetyMultiplier: number;
    preferredSupplierId: string | null;
    autoGenerate: boolean;
    autoApprove: boolean;
    autoApproveLimit: number | null;
    notifyOnLow: boolean;
    notifyEmails: string[];
    isActive: boolean;
    tenantId: string;
    createdAt: Date;
}

export interface ShopReorderSuggestion {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQty: number;
    avgDailySales: number;
    daysOfStock: number;
    lastSaleDate: Date | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED';
    purchaseOrderId: string | null;
    processedById: string | null;
    processedAt: Date | null;
    rejectionReason: string | null;
    tenantId: string;
    createdAt: Date;
}

export interface ShopSupplier {
    id: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    paymentTermDays: number;
    leadTimeDays: number;
    totalOrders: number;
    onTimeDelivery: number;
    tenantId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ShopPurchaseOrder {
    id: string;
    orderNumber: string;
    supplierId: string;
    supplier?: ShopSupplier;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
    status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL_RECEIVED' | 'RECEIVED' | 'CANCELLED';
    expectedDate: Date | null;
    receivedDate: Date | null;
    notes: string | null;
    items: ShopPurchaseOrderItem[];
    createdById: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ShopPurchaseOrderItem {
    id: string;
    purchaseOrderId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    receivedQty: number;
    unitCost: number;
    lineTotal: number;
}

// Input types for creating/updating

export interface CreateCustomerInput {
    name: string;
    phone: string;
    email?: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    businessName?: string;
    taxId?: string;
    customerType?: 'RETAIL' | 'WHOLESALE' | 'MECHANIC' | 'FLEET' | 'VIP';
    creditLimit?: number;
    paymentTermDays?: number;
}

export interface CreateInvoiceInput {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    vehicleInfo?: string;
    notes?: string;
}

export interface InvoiceItemInput {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discountPercent?: number;
    taxRate?: number;
    vehicleInfo?: string;
}

export interface PaymentInput {
    amount: number;
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'MOBILE_PAYMENT';
    reference?: string;
}

export interface CreatePromotionInput {
    name: string;
    description?: string;
    code?: string;
    type: 'AUTOMATIC' | 'CODE' | 'COUPON';
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
    discountValue: number;
    minimumPurchase?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    perCustomerLimit?: number;
    targetType?: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES' | 'SPECIFIC_BRANDS';
    targetProductIds?: string[];
    targetCategories?: string[];
    targetBrands?: string[];
    targetAudienceIds?: string[];
    startDate: Date;
    endDate?: Date;
}

export interface CreateSupplierInput {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTermDays?: number;
    leadTimeDays?: number;
}

export interface CreatePurchaseOrderInput {
    supplierId: string;
    expectedDate?: Date;
    notes?: string;
    isTaxEnabled?: boolean;
    items: {
        productId: string;
        quantity: number;
        unitCost: number;
    }[];
}

// Dashboard stats
export interface DashboardStats {
    todaySales: {
        total: number;
        count: number;
        avgTicket: number;
    };
    monthSales: {
        total: number;
        count: number;
    };
    lowStockCount: number;
    pendingReorders: number;
    activeCustomers: number;
    activePromotions: number;
}

// Report types
export interface DateRange {
    from: Date;
    to: Date;
}

export interface SalesSummary {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    totalTransactions: number;
    avgTicketSize: number;
    topProducts: {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }[];
    salesByDay: {
        date: string;
        revenue: number;
        transactions: number;
    }[];
}
