// Inventory & Operations Module Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: 'STORABLE' | 'CONSUMABLE' | 'SERVICE';
  listPrice: number;
  costPrice?: number;
  qtyAvailable: number;
  qtyReserved: number;
  barcode?: string;
  weight?: number;
  volume?: number;
  isActive: boolean;
  canBeSold: boolean;
  canBePurchased: boolean;
  categoryId?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
}

export interface StockMove {
  id: string;
  reference: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  type: 'IN' | 'OUT' | 'INTERNAL' | 'ADJUSTMENT';
  date: Date;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  supplier: string;
  orderDate: Date;
  expectedDate?: Date;
  subtotal: number;
  tax: number;
  total: number;
}
