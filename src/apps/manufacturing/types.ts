// PHASE 2: Manufacturing (MRP) Module Types

export interface BillOfMaterials {
  id: string;
  code: string;
  productId: string;
  quantity: number;
  type: 'MANUFACTURE' | 'KIT' | 'SUBCONTRACT';
  components: BOMComponent[];
  operations: ManufacturingOperation[];
}

export interface BOMComponent {
  id: string;
  bomId: string;
  productId: string;
  quantity: number;
}

export interface ManufacturingOperation {
  id: string;
  name: string;
  bomId: string;
  workCenterId: string;
  duration: number; // in minutes
  sequence: number;
}

export interface WorkCenter {
  id: string;
  name: string;
  code: string;
  capacity: number;
  efficiency: number;
}

export interface ManufacturingOrder {
  id: string;
  reference: string;
  bomId: string;
  productId: string;
  quantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  scheduledDate?: Date;
  startDate?: Date;
  endDate?: Date;
}

export interface ProductionReport {
  orderId: string;
  producedQuantity: number;
  scrapQuantity: number;
  efficiency: number;
  duration: number;
  cost: number;
}
