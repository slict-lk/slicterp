export interface ERPModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  price: number;
}

export const AVAILABLE_MODULES: ERPModule[] = [
  {
    id: "accounting",
    name: "Accounting & Finance",
    description: "Full double-entry accounting, invoicing, real-time ledgers, and financial insights to boost your profit margins.",
    icon: "Calculator",
    features: ["Automated Invoicing", "Tax Management", "Multi-Currency", "Financial Reporting"],
    price: 49.99,
  },
  {
    id: "hr",
    name: "Human Resources (HRMS)",
    description: "Manage your workforce effortlessly with payroll, attendance tracking, performance reviews, and leave management.",
    icon: "Users",
    features: ["Payroll Calculation", "Leave Management", "Performance Reviews", "Employee Portal"],
    price: 39.99,
  },
  {
    id: "crm",
    name: "Customer Relationship Management",
    description: "Turn leads into loyal customers. Track sales pipelines, manage contacts, and increase your conversion rates.",
    icon: "LineChart",
    features: ["Lead Tracking", "Sales Pipeline", "Email Integration", "Customer Support"],
    price: 29.99,
  },
  {
    id: "inventory",
    name: "Inventory Management",
    description: "Never run out of stock. Real-time inventory tracking, procurement automation, and warehouse management.",
    icon: "Package",
    features: ["Real-time Stock", "Barcode Scanning", "Multi-Warehouse", "Supplier Management"],
    price: 59.99,
  },
  {
    id: "projects",
    name: "Project Management",
    description: "Keep your teams aligned. Deliver projects on time and under budget with Gantt charts, tasks, and time tracking.",
    icon: "Kanban",
    features: ["Task Management", "Time Tracking", "Gantt Charts", "Resource Allocation"],
    price: 29.99,
  },
  {
    id: "healthcare",
    name: "Healthcare Management",
    description: "Built for clinics and hospitals. Manage patient records, appointments, prescriptions, and billing in one secure place.",
    icon: "Stethoscope",
    features: ["Patient Records", "Appointment Scheduling", "Prescription Gen", "Billing"],
    price: 99.99,
  },
  {
    id: "real-estate",
    name: "Real Estate Property Manager",
    description: "Manage listings, agents, and leases. Ideal for property managers wanting a comprehensive overview of their portfolio.",
    icon: "Home",
    features: ["Property Listings", "Lease Management", "Agent Tracking", "Virtual Tours"],
    price: 79.99,
  },
  {
    id: "manufacturing",
    name: "Manufacturing (MRP)",
    description: "Optimize production lines, manage bill of materials (BOM), and reduce manufacturing bottlenecks.",
    icon: "Factory",
    features: ["Bill of Materials", "Production Planning", "Quality Control", "Equipment Maintenance"],
    price: 149.99,
  },
  {
    id: "pos",
    name: "Point of Sale (POS)",
    description: "Fast, reliable retail transactions. Works offline, integrates with inventory, and accepts multiple payment methods.",
    icon: "Store",
    features: ["Offline Support", "Receipt Printing", "Split Payments", "Cash Drawer"],
    price: 39.99,
  },
  {
    id: "restaurant",
    name: "Restaurant Management",
    description: "Streamline orders, manage kitchen tickets (KDS), and coordinate table seating smoothly.",
    icon: "Utensils",
    features: ["Table Management", "Kitchen Display", "Menu Builder", "Waitstaff Tracking"],
    price: 49.99,
  },
  {
    id: "hotel",
    name: "Hotel Management",
    description: "Complete hotel operations including room management, guest services, dining, and housekeeping.",
    icon: "Building",
    features: ["Room Management", "Guest Services", "Dining & Experiences", "Housekeeping", "Front Desk"],
    price: 89.99,
  },
];
