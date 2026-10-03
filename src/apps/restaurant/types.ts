// PHASE 4: Restaurant & Hospitality Module Types

export interface RestaurantTable {
  id: string;
  number: string;
  capacity: number;
  location?: 'INDOOR' | 'OUTDOOR' | 'PATIO' | 'BAR';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  shape?: 'ROUND' | 'SQUARE' | 'RECTANGULAR';
}

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  tableId: string;
  guestCount: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: RestaurantOrderItem[];
  createdAt: Date;
  completedAt?: Date;
}

export interface RestaurantOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  modifiers?: ItemModifier[];
}

export interface ItemModifier {
  name: string;
  price: number;
}

export interface Reservation {
  id: string;
  customerName: string;
  email?: string;
  phone: string;
  date: Date;
  time: string;
  guestCount: number;
  tableId?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  specialRequests?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  cost?: number;
  preparationTime?: number; // in minutes
  isAvailable: boolean;
  allergens?: string[];
  tags?: string[];
  imageUrl?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sequence: number;
  isActive: boolean;
}

export interface KitchenOrder {
  id: string;
  orderItemId: string;
  itemName: string;
  quantity: number;
  tableNumber: string;
  status: 'NEW' | 'IN_PROGRESS' | 'READY' | 'SERVED';
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  specialInstructions?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  role: 'WAITER' | 'CHEF' | 'BARTENDER' | 'HOST' | 'MANAGER';
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface RestaurantAnalytics {
  date: Date;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  averageTableTurnover: number;
  popularItems: PopularItem[];
  peakHours: HourlyData[];
}

export interface PopularItem {
  itemId: string;
  itemName: string;
  orderCount: number;
  revenue: number;
}

export interface HourlyData {
  hour: number;
  orders: number;
  revenue: number;
}
