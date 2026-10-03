'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useInView, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Calendar, BarChart3, Settings,
  Zap, Globe, Factory, Building2, Mail, MessageSquare, BookOpen, GraduationCap, Home,
  CreditCard, Phone, Store, Hotel, UtensilsCrossed, Heart, Wrench, CheckSquare, ArrowRight,
  ShieldCheck, Sparkles, CloudCog, Menu, X, ChevronRight, Play, Briefcase, Code, LifeBuoy, Youtube
} from 'lucide-react';

// --- Data & Constants ---

const HERO_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    description: 'Tenant isolation & audit trails',
  },
  {
    icon: Sparkles,
    title: 'AI Copilots',
    description: 'Smart assistants everywhere',
  },
  {
    icon: CloudCog,
    title: 'Automation First',
    description: 'Self-healing workflows',
  },
];

const STAT_HIGHLIGHTS = [
  { value: '40+', label: 'Business Apps', accent: 'text-blue-600 bg-blue-50', icon: LayoutDashboard, numeric: 41, suffix: '+' },
  { value: '20+', label: 'AI Agents', accent: 'text-purple-600 bg-purple-50', icon: Sparkles, numeric: 20, suffix: '+' },
  { value: '∞', label: 'Multi-Tenancy', accent: 'text-orange-600 bg-orange-50', icon: Globe, numeric: 251, suffix: ' Tenants' },
  { value: '99.9%', label: 'Uptime SLA', accent: 'text-green-600 bg-green-50', icon: ShieldCheck, numeric: 99.9, suffix: '%' },
];

const SOLUTIONS_DATA = [
  { id: 'automotive', title: 'Automotive', icon: Wrench, color: 'text-amber-600 bg-amber-50', description: 'End-to-end vehicle management, service shop, and parts inventory.' },
  { id: 'vehicle-export', title: 'Vehicle Export', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50', description: 'Global auction management, bidding, shipping, and logistics.' },
  { id: 'healthcare', title: 'Healthcare', icon: Heart, color: 'text-rose-600 bg-rose-50', description: 'Complete hospital management: admissions, pharmacy, lab, and consultation.' },
  { id: 'hotel', title: 'Hospitality', icon: Hotel, color: 'text-indigo-600 bg-indigo-50', description: 'PMS with booking engine, housekeeping, events, and guest experiences.' },
  { id: 'spareparts', title: 'Spare Parts', icon: Settings, color: 'text-orange-600 bg-orange-50', description: 'Specialized POS for parts, detailed inventory, and supplier management.' },
  { id: 'realestate', title: 'Real Estate', icon: Home, color: 'text-emerald-600 bg-emerald-50', description: 'Property leasing, tenant management, maintenance, and listings.' },
];

const RESOURCES_DATA = [
  { title: 'Documentation', icon: BookOpen, description: 'Comprehensive guides for implementation.', href: '#' },
  { title: 'API Reference', icon: Code, description: 'Connect your tools with our robust API.', href: '#' },
  { title: 'Community', icon: Users, description: 'Join thousands of developers and users.', href: '#' },
  { title: 'Help Center', icon: LifeBuoy, description: '24/7 support and troubleshooting.', href: '#' },
  { title: 'Blog', icon: FileText, description: 'Latest updates, tips, and industry insights.', href: '#' },
  { title: 'Video Tutorials', icon: Play, description: 'Step-by-step video guides for all features.', href: '#' },
];

const APP_CATEGORIES = [
  { id: "vehicle-export", label: "Vehicle Export", icon: Globe, color: "blue" },
  { id: "automotive", label: "Automotive", icon: Wrench, color: "amber" },
  { id: "spareparts", label: "Spare Parts", icon: Settings, color: "orange" },
  { id: "healthcare", label: "Healthcare", icon: Heart, color: "rose" },
  { id: "hotel", label: "Hotel & PMS", icon: Hotel, color: "indigo" },
  { id: "realestate", label: "Real Estate", icon: Home, color: "emerald" },
  { id: "manufacturing", label: "Manufacturing", icon: Factory, color: "amber" },
  { id: "sales", label: "Sales & CRM", icon: ShoppingCart, color: "cyan" },
  { id: "accounting", label: "Finance", icon: FileText, color: "gray" },
  { id: "inventory", label: "Inventory", icon: Package, color: "violet" },
  { id: "hr", label: "HR & People", icon: Users, color: "pink" },
  { id: "projects", label: "Projects", icon: LayoutDashboard, color: "indigo" },
  { id: "website", label: "Website", icon: Globe, color: "sky" },
  { id: "pos", label: "POS", icon: Store, color: "pink" },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, color: "cyan" },
  { id: "purchasing", label: "Purchasing", icon: ShoppingCart, color: "teal" },
  { id: "quality", label: "Quality", icon: ShieldCheck, color: "lime" },
  { id: "education", label: "Education", icon: GraduationCap, color: "yellow" },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, color: "red" },
  { id: "helpdesk", label: "Helpdesk", icon: MessageSquare, color: "blue" },
  { id: "automation", label: "Automation", icon: Zap, color: "purple" },
  { id: "integrations", label: "Integrations", icon: CloudCog, color: "gray" },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, color: "green" },
  { id: "ai", label: "AI & Studio", icon: Sparkles, color: "fuchsia" },
  { id: "contacts", label: "Contacts", icon: Users, color: "blue" },
  { id: "calendar", label: "Calendar", icon: Calendar, color: "red" },
  { id: "livechat", label: "Live Chat", icon: MessageSquare, color: "green" },
  { id: "surveys", label: "Surveys", icon: FileText, color: "orange" },
  { id: "reports", label: "Reports", icon: BarChart3, color: "indigo" },
  { id: "blog", label: "Blog", icon: FileText, color: "pink" },
  { id: "email", label: "Email Mkt", icon: Mail, color: "purple" },
  { id: "events", label: "Events", icon: Calendar, color: "yellow" },
];

const APP_DATA: Record<string, { title: string; apps: { name: string; functions: string[] }[] }> = {
  "vehicle-export": {
    title: "Vehicle Export & Logistics",
    apps: [
      { name: "Auction Management", functions: ["Live bidding", "Lot tracking", "Auctioneer dashboard"] },
      { name: "Shipping & Logistics", functions: ["Container tracking", "Vessel schedules", "Bill of Lading"] },
      { name: "Yard Management", functions: ["Gate in/out", "Inspection", "Storage location"] },
      { name: "Global Finance", functions: ["Multi-currency", "Exchange rates", "Export documentation"] },
    ]
  },
  automotive: {
    title: "Automotive Service",
    apps: [
      { name: "Workshop", functions: ["Job cards", "Technician scheduling", "Service history"] },
      { name: "Vehicle Sales", functions: ["Showroom management", "Test drives", "Financing"] },
      { name: "Parts Integration", functions: ["EPC integration", "Cross-referencing", "Stock checks"] },
      { name: "Customer Portal", functions: ["Service booking", "Status updates", "Invoice payment"] },
    ]
  },
  spareparts: {
    title: "Spare Parts Management",
    apps: [
      { name: "Parts POS", functions: ["Counter sales", "Barcode scanning", "Quick lookup"] },
      { name: "Inventory Control", functions: ["Bin locations", "Reorder points", "Stock adjustments"] },
      { name: "Supplier Management", functions: ["Purchase orders", "Vendor rating", "Lead times"] },
      { name: "Promotions", functions: ["Discount rules", "Bundles", "Seasonal offers"] },
    ]
  },
  healthcare: {
    title: "Healthcare Information System",
    apps: [
      { name: "Patient Management", functions: ["Registration", "Medical history", "Insurance"] },
      { name: "Clinical Module", functions: ["Doctor consultation", "Prescriptions", "Diagnosis"] },
      { name: "Laboratory", functions: ["Sample tracking", "Test results", "Lab reports"] },
      { name: "Pharmacy", functions: ["Dispensing", "Stock management", "Expiry tracking"] },
      { name: "Inpatient", functions: ["Ward management", "Bed allocation", "Discharge summary"] },
    ]
  },
  hotel: {
    title: "Hotel PMS",
    apps: [
      { name: "Front Desk", functions: ["Check-in/out", "Reservations", "Guest profiles"] },
      { name: "Housekeeping", functions: ["Room status", "Cleaning schedules", "Maintenance requests"] },
      { name: "Booking Engine", functions: ["Direct bookings", "Channel manager", "Dynamic pricing"] },
      { name: "Events & Banquets", functions: ["Hall booking", "Catering", "Event planning"] },
      { name: "Restaurant POS", functions: ["Table management", "KOT", "Room service"] },
    ]
  },
  realestate: {
    title: "Property Management",
    apps: [
      { name: "Leasing", functions: ["Contract management", "Renewals", "Rent collection"] },
      { name: "Maintenance", functions: ["Work orders", "Vendor assignment", "Cost tracking"] },
      { name: "Tenant Portal", functions: ["Online payments", "Service requests", "Announcements"] },
      { name: "Listings", functions: ["Property marketing", "Portals syndication", "Virtual tours"] },
    ]
  },
  sales: {
    title: "Sales & CRM",
    apps: [
      { name: "Customer Management", functions: ["Customer database", "Contact management", "Communication history"] },
      { name: "Lead Management", functions: ["Lead capture", "Scoring", "Conversion"] },
      { name: "Sales Orders", functions: ["Order creation", "Pricing & discounts", "Workflow"] },
      { name: "Quotations", functions: ["Quote generation", "PDF export", "Email sending"] },
    ]
  },
  inventory: {
    title: "Inventory & Operations",
    apps: [
      { name: "Product Management", functions: ["SKU management", "Variants", "Barcode support"] },
      { name: "Warehouse Management", functions: ["Multi-warehouse", "Location tracking", "Stock levels"] },
      { name: "Stock Movements", functions: ["Receipts", "Issues", "Transfers", "Adjustments"] },
    ]
  },
  accounting: {
    title: "Accounting & Finance",
    apps: [
      { name: "Invoicing", functions: ["Tax calculations", "Payment tracking", "Recurring invoices"] },
      { name: "Expenses", functions: ["Receipt upload", "Approval workflow", "Reimbursement"] },
      { name: "Reports", functions: ["P&L statements", "Balance sheet", "Cash flow"] },
    ]
  },
  hr: {
    title: "HR & People",
    apps: [
      { name: "Employees", functions: ["Profiles", "Documents", "History"] },
      { name: "Attendance", functions: ["Time tracking", "Leaves", "Overtime"] },
      { name: "Payroll", functions: ["Salary processing", "Payslips", "Tax deductions"] },
    ]
  },
  manufacturing: {
    title: "Manufacturing",
    apps: [
      { name: "Bill of Materials", functions: ["BOM creation", "Versioning", "Cost calculation"] },
      { name: "Work Orders", functions: ["Production scheduling", "Material allocation", "Tracking"] },
      { name: "Planning", functions: ["Capacity planning", "Resource allocation", "Optimization"] },
    ]
  },
  projects: {
    title: "Projects",
    apps: [
      { name: "Project Management", functions: ["Planning", "Resource allocation", "Progress tracking"] },
      { name: "Task Tracking", functions: ["Kanban board", "Assignments", "Dependencies"] },
      { name: "Timesheets", functions: ["Time logging", "Billable hours", "Approvals"] },
    ]
  },
  education: {
    title: "Education & LMS",
    apps: [
      { name: "Student Info", functions: ["Admissions", "Profiles", "Attendance"] },
      { name: "Courses", functions: ["Curriculum", "Materials", "Assignments"] },
      { name: "Exams", functions: ["Scheduling", "Grading", "Report cards"] },
    ]
  },
  website: {
    title: "Website & Content",
    apps: [
      { name: "CMS", functions: ["Page builder", "Blog", "Media library"] },
      { name: "eCommerce", functions: ["Product catalog", "Cart", "Checkout"] },
      { name: "Forum", functions: ["User discussions", "Moderation", "Categories"] },
    ]
  },
};

// Fill in missing keys with generic data to ensure no crashes
APP_CATEGORIES.forEach(cat => {
  if (!APP_DATA[cat.id]) {
    APP_DATA[cat.id] = {
      title: cat.label,
      apps: [{ name: `${cat.label} Core`, functions: ["Core functionality", "Management", "Reporting", "Settings"] }]
    };
  }
});


// --- Helper Components ---

// --- Helper Components ---

function AnimatedCounter({ value, suffix = '' }: { value: number, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });

  useEffect(() => {
    if (inView) {
      motionValue.set(value);
    }
  }, [inView, value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest.toFixed(value % 1 === 0 ? 0 : 1) + suffix;
      }
    });
  }, [springValue, value, suffix]);

  return <span ref={ref} />;
}

// 3D Dashboard Preview Component
function HeroImage() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 50]);
  const rotateX = useTransform(scrollY, [0, 500], [0, 10]);

  return (
    <motion.div
      style={{ y, rotateX }}
      initial={{ opacity: 0, y: 50, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5, type: 'spring' }}
      className="relative mt-20 mx-auto max-w-6xl perspective-1000"
    >
      <div className="relative rounded-xl border border-gray-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/9] group">
        {/* Browser Chrome */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gray-100/80 border-b border-gray-200 flex items-center px-4 gap-2 z-10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center text-xs text-gray-400 font-mono">dashboard.slicterp.com/vehicle-export</div>
        </div>

        {/* Mock Dashboard Content - CSS Only Construction for realism without images */}
        <div className="absolute inset-0 top-10 bg-gray-50 p-6 overflow-hidden flex gap-6">
          {/* Sidebar */}
          <div className="w-64 hidden md:flex flex-col gap-4">
            <div className="h-10 w-full bg-white rounded-lg border border-gray-100 shadow-sm animate-pulse" />
            <div className="flex-1 w-full bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 w-full bg-gray-100/50 rounded-md" />)}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Header Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Active Auctions', val: '124', color: 'bg-blue-500' },
                { label: 'Total Revenue', val: '$2.4M', color: 'bg-green-500' },
                { label: 'Pending Bids', val: '89', color: 'bg-orange-500' },
                { label: 'Shipments', val: '1,029', color: 'bg-purple-500' },
              ].map((s, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="text-xs text-gray-400 uppercase font-semibold">{s.label}</div>
                  <div className="text-2xl font-bold text-gray-800">{s.val}</div>
                  <div className={`h-1 w-full rounded-full ${s.color} opacity-20`}>
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6 flex-1">
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-50 to-transparent" />
                <div className="flex items-end justify-between h-40 gap-2 mt-auto px-4 pb-0 relative z-10 opacity-60">
                  {[40, 60, 45, 70, 50, 65, 80, 55, 75, 90, 60, 70].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.05) }}
                      className="w-full bg-blue-500 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100" />
                    <div className="flex-1 h-3 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gloss Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Glow behind */}
      <div className="absolute inset-0 -z-10 bg-blue-500/10 blur-[100px] scale-90 translate-y-10" />
    </motion.div>
  );
}

// Spotlight Card
function SpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-3xl border border-gray-100 bg-white ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.1), transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

// Bento Grid
function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="md:col-span-2 p-8 rounded-3xl bg-gray-900 text-white relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/30 transition-colors" />
        <div className="relative z-10">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Enterprise-Grade Security</h3>
          <p className="text-gray-400 max-w-md">Built on a multi-tenant architecture with strict data isolation, audit logs, and role-based access control. SOC2 compliant ready.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-8 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden group hover:border-blue-200 transition-colors"
      >
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-blue-600">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">AI Copilots</h3>
        <p className="text-gray-600 text-sm">Smart assistants embedded in every module.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-8 rounded-3xl bg-purple-50 border border-purple-100 relative overflow-hidden group hover:border-purple-200 transition-colors"
      >
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-purple-600">
          <CloudCog className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Automation First</h3>
        <p className="text-gray-600 text-sm">Self-healing workflows that run 24/7.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 relative overflow-hidden group"
      >
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex-1">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 border border-orange-100 text-orange-600">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Lightning Fast Performance</h3>
            <p className="text-gray-600">Optimized for speed with edge caching and database indexing. Experience sub-100ms load times.</p>
          </div>
          {/* Tiny mock chart */}
          <div className="w-full md:w-64 h-32 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-end gap-1">
            {[30, 50, 45, 80, 60, 90, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-orange-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Logo Marquee
const LOGOS = ["Acme Corp", "Global Logistics", "HealthPlus", "EduTech", "BuildRight", "Nova Hotels", "Swift Motors"];
function LogoMarquee() {
  return (
    <section className="py-10 border-y border-gray-100 bg-white overflow-hidden">
      <div className="container mx-auto px-6 mb-6 text-center">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Trusted by Industry Leaders</p>
      </div>
      <div className="relative flex overflow-x-hidden">
        <motion.div
          className="flex gap-16 py-4 animate-marquee whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
        >
          {[...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
            <span key={i} className="text-2xl font-bold text-gray-300 hover:text-gray-400 transition-colors cursor-default select-none">
              {logo}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}


// --- Main Components ---

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      setMobileMenuOpen(false);
      setActiveDropdown(null);
    }
  };

  const handleDropdownEnter = (id: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(id);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 200);
  };

  const NAV_ITEMS = [
    {
      label: 'Features', id: 'features',
      preview: {
        heading: 'Powerful Capabilities',
        description: '40+ integrated business apps with AI copilots, automation, and enterprise-grade security.',
        highlights: [
          { icon: Sparkles, text: 'AI-Powered Insights' },
          { icon: ShieldCheck, text: 'Enterprise Security' },
          { icon: Zap, text: 'Smart Automation' },
        ]
      }
    },
    {
      label: 'Solutions', id: 'solutions',
      preview: {
        heading: 'Industry Solutions',
        description: 'Purpose-built modules for healthcare, hospitality, automotive, real estate, and more.',
        highlights: [
          { icon: Heart, text: 'Healthcare' },
          { icon: Hotel, text: 'Hospitality' },
          { icon: Wrench, text: 'Automotive' },
        ]
      }
    },
    {
      label: 'Pricing', id: 'pricing',
      preview: {
        heading: 'Flexible Plans',
        description: 'Pay only for the modules you use. Start free for 14 days, no credit card required.',
        highlights: [
          { icon: CheckSquare, text: 'Free 14-Day Trial' },
          { icon: Package, text: 'Modular Pricing' },
          { icon: Users, text: 'Unlimited Users' },
        ]
      }
    },
    {
      label: 'Resources', id: 'resources',
      preview: {
        heading: 'Learn & Connect',
        description: 'Documentation, API reference, community, and 24/7 support to help you succeed.',
        highlights: [
          { icon: BookOpen, text: 'Documentation' },
          { icon: Code, text: 'API Reference' },
          { icon: MessageSquare, text: 'Community' },
        ]
      }
    },
  ];

  const mobileLinks = [
    { label: 'Features', id: 'features', icon: Sparkles, desc: 'AI-powered business apps' },
    { label: 'Solutions', id: 'solutions', icon: Building2, desc: 'Industry-specific modules' },
    { label: 'Pricing', id: 'pricing', icon: CreditCard, desc: 'Flexible, modular plans' },
    { label: 'Resources', id: 'resources', icon: BookOpen, desc: 'Docs, API & community' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
          ? 'py-2'
          : 'py-4'
          }`}
      >
        {/* Floating glass pill container */}
        <div className={`container mx-auto px-4 transition-all duration-500 ${scrolled ? 'max-w-5xl' : 'max-w-7xl'}`}>
          <div className={`flex items-center justify-between transition-all duration-500 rounded-2xl px-5 ${scrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 py-2.5'
            : 'bg-transparent py-1'
            }`}>
            {/* Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="relative h-9 w-9">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/25 group-hover:shadow-blue-600/40 transition-shadow duration-300" />
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">S</div>
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className={`transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-gray-900'}`}>SLICT</span>
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">ERP</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(item.id)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1 ${activeDropdown === item.id
                      ? 'text-blue-600 bg-blue-50/80'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
                      }`}
                  >
                    {item.label}
                    <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${activeDropdown === item.id ? 'rotate-90 text-blue-500' : 'text-gray-300'
                      }`} />
                  </a>

                  {/* Mega-menu dropdown */}
                  <AnimatePresence>
                    {activeDropdown === item.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
                        onMouseEnter={() => handleDropdownEnter(item.id)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <div className="w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-100/80 overflow-hidden">
                          {/* Gradient accent top */}
                          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600" />
                          <div className="p-5">
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{item.preview.heading}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.preview.description}</p>
                            <div className="space-y-2.5">
                              {item.preview.highlights.map((h, i) => (
                                <div key={i} className="flex items-center gap-3 group/item cursor-pointer">
                                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors duration-200">
                                    <h.icon className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <span className="text-sm text-gray-700 font-medium group-hover/item:text-gray-900 transition-colors">{h.text}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <a
                                href={`#${item.id}`}
                                onClick={(e) => scrollToSection(e, item.id)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                              >
                                Explore {item.label} <ArrowRight className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 rounded-xl px-5 h-9 text-sm font-medium transition-all duration-200"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="relative bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl px-5 h-9 text-sm font-medium shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  Start Free Trial
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 transition-all duration-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* --- Full-screen mobile menu overlay --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop - fades in separately */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 z-40 bg-white/98 backdrop-blur-2xl lg:hidden"
            />

            {/* Content - slides up from bottom */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
                exit: { duration: 0.25, ease: [0.4, 0, 1, 1] }
              }}
              className="fixed inset-0 z-40 lg:hidden"
            >
              <div className="relative h-full flex flex-col pt-24 pb-8 px-6 overflow-y-auto">
                {/* Gradient accent line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400 mb-8 origin-left rounded-full"
                />

                {/* Navigation links */}
                <nav className="flex-1 space-y-1">
                  {mobileLinks.map((item, i) => (
                    <motion.a
                      key={item.label}
                      href={`#${item.id}`}
                      onClick={(e) => scrollToSection(e as unknown as React.MouseEvent<HTMLAnchorElement>, item.id)}
                      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        duration: 0.45,
                        delay: 0.12 + 0.08 * i,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-blue-50/60 active:bg-blue-100/60 transition-colors duration-200 group"
                    >
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200/80 transition-all duration-300 shadow-sm">
                        <item.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-semibold text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200" />
                    </motion.a>
                  ))}
                </nav>

                {/* Mobile CTA buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.35,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="space-y-3 mt-8"
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />
                  <Link href="/register" className="block w-full">
                    <Button className="w-full justify-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white h-13 text-base rounded-2xl shadow-lg shadow-blue-500/20 font-semibold transition-all duration-300 active:scale-[0.98]">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login" className="block w-full">
                    <Button variant="outline" className="w-full justify-center h-13 text-base rounded-2xl border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium transition-all duration-200 active:scale-[0.98]">
                      Sign In
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-gray-400 mt-4">
                    14-day free trial · No credit card required
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white selection:bg-blue-100">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white" />
        <div className="absolute w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 md:mb-8 px-4 py-1.5 rounded-full border-blue-200 bg-blue-50/50 text-blue-700 text-xs md:text-sm font-medium backdrop-blur-sm shadow-sm hover:bg-blue-100 transition-colors cursor-default">
              🚀 New: AI-First Multi-Tenant Architecture
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 mb-6 md:mb-8 leading-[1.1]"
          >
            The Operating System for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient bg-[length:200%_auto] pb-2">
              Modern Business
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-2xl text-gray-600 mb-8 md:mb-10 max-w-3xl leading-relaxed mx-auto font-light"
          >
            Unify your entire organization with SLICT ERP. From CRM to Manufacturing,
            experience a seamless, AI-powered suite designed for scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200/50 transition-all hover:scale-105 active:scale-95">
                Start Free Trial <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto bg-white rounded-full">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all active:scale-95">
                Sign In
              </Button>
            </Link>
            <div
              onClick={(e) => {
                const element = document.getElementById('features');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto cursor-pointer flex justify-center mt-2 sm:mt-0"
            >
              <span className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors underline-offset-4 hover:underline px-4">
                Explore Features
              </span>
            </div>
          </motion.div>

          {/* New 3D Dashboard Mockup */}
          <HeroImage />

          {/* New Bento Grid */}
          <BentoGrid />
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="py-20 bg-white border-y border-gray-100/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100/0 md:divide-gray-100">
          {STAT_HIGHLIGHTS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center px-4"
            >
              <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${stat.accent} transition-transform hover:scale-110 duration-300`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
                {stat.numeric ? (
                  <AnimatedCounter value={stat.numeric} suffix={stat.suffix} />
                ) : stat.value}
              </div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <LogoMarquee />
    </section>
  );
}

function Solutions() {
  return (
    <section id="solutions" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gray-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-full border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium">
            Industries
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tailored for Your Industry</h2>
          <p className="text-lg text-gray-600">
            SLICT ERP adapts to your specific needs with specialized modules and workflows designed for your sector.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SOLUTIONS_DATA.map((solution, i) => (
            <motion.div
              key={solution.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <SpotlightCard className="p-8 h-full flex flex-col group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${solution.color} group-hover:scale-110 transition-transform duration-300`}>
                  <solution.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{solution.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                  {solution.description}
                </p>
                <div className="flex items-center text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform cursor-pointer mt-auto">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


function AppExplorer() {
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <section id="features" className="py-24 bg-gray-50/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-full border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium">
            Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Run Your Business</h2>
          <p className="text-lg text-gray-600">
            A complete suite of applications, fully integrated and ready to use.
            Switch between modules to see the power of SLICT ERP.
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-200 overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[600px]">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-80 bg-gray-50/50 border-r border-gray-100 p-4 overflow-y-auto max-h-[300px] md:max-h-[700px] custom-scrollbar">
              <div className="space-y-1">
                {APP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === cat.id
                      ? 'bg-white text-blue-600 shadow-md shadow-gray-200/50 ring-1 ring-gray-100 scale-[1.02]'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                  >
                    <cat.icon className={`h-5 w-5 ${activeTab === cat.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    {cat.label}
                    {activeTab === cat.id && <motion.div layoutId="activeTabIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 md:p-16 bg-white flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-blue-50 rounded-2xl shadow-sm">
                      {(() => {
                        const Icon = APP_CATEGORIES.find(c => c.id === activeTab)?.icon || LayoutDashboard;
                        return <Icon className="h-10 w-10 text-blue-600" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-1">{APP_DATA[activeTab]?.title}</h3>
                      <p className="text-gray-500 text-lg">Comprehensive tools for your team</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {APP_DATA[activeTab]?.apps.map((app, idx) => (
                      <Card key={idx} className="border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 group cursor-default bg-gray-50/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                            <CheckSquare className="h-5 w-5 text-blue-500" />
                            {app.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2.5">
                            {app.functions.map((func, fIdx) => (
                              <li key={fIdx} className="text-sm text-gray-600 flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 group-hover:bg-blue-400 transition-colors shrink-0" />
                                {func}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCalculator() {
  const [numUsers, setNumUsers] = useState(5);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  const baseUserPrice = 12; // $12 per user
  const appPrice = 4; // $4 per app

  // Odoo-style price calculation logic
  const isEnterprise = selectedApps.length > 10;
  const totalAppCost = isEnterprise ? 40 : selectedApps.length * appPrice;
  const userCost = numUsers * baseUserPrice;
  const monthlyTotal = userCost + totalAppCost;
  const finalPrice = billingCycle === 'yearly' ? monthlyTotal * 0.8 : monthlyTotal;

  const toggleApp = (appId: string) => {
    setSelectedApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const selectAllApps = () => {
    if (selectedApps.length === APP_CATEGORIES.length) {
      setSelectedApps([]);
    } else {
      setSelectedApps(APP_CATEGORIES.map(c => c.id));
    }
  };

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-full border-green-200 bg-green-50 text-green-700 text-sm font-medium">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Build Your Perfect Plan</h2>
          <p className="text-lg text-gray-600">
            Pay only for what you use. Add apps as you grow.
            <span className="font-medium text-blue-600"> No hidden fees.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* App Selection Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gray-50/50 border-b border-gray-100">
                <div>
                  <CardTitle className="text-xl">Select Apps</CardTitle>
                  <CardDescription>Choose the modules you need for your business</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={selectAllApps} className="hover:bg-blue-50 hover:text-blue-600 border-gray-200">
                  {selectedApps.length === APP_CATEGORIES.length ? 'Deselect All' : 'Select All'}
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {APP_CATEGORIES.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => toggleApp(app.id)}
                      className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 select-none ${selectedApps.includes(app.id)
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                      <div className={`p-1.5 rounded-lg ${selectedApps.includes(app.id) ? 'bg-blue-200' : 'bg-gray-100'}`}>
                        <app.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{app.label}</span>
                      {selectedApps.includes(app.id) && <CheckSquare className="h-4 w-4 ml-auto text-blue-600" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <CardTitle className="text-xl">Number of Users</CardTitle>
                <CardDescription>How many people will use the system?</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-gray-900">{numUsers} <span className="text-lg text-gray-500 font-normal">Users</span></span>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => setNumUsers(Math.max(1, numUsers - 1))} className="h-10 w-10 rounded-full hover:bg-gray-100">-</Button>
                      <Button variant="outline" size="icon" onClick={() => setNumUsers(numUsers + 1)} className="h-10 w-10 rounded-full hover:bg-gray-100">+</Button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={numUsers}
                    onChange={(e) => setNumUsers(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                  />
                  <div className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <span>1 User</span>
                    <span>50 Users</span>
                    <span>100+ Users</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Summary Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="bg-gray-900 text-white border-none shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl">Estimated Cost</CardTitle>
                  <CardDescription className="text-gray-400">Total details billed {billingCycle}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 relative z-10 pt-6">
                  <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${billingCycle === 'yearly' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      Yearly <span className="text-green-400 text-xs ml-1">-20%</span>
                    </button>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>{numUsers} Users <span className="text-gray-500 text-xs">x ${baseUserPrice}</span></span>
                      <span>${userCost}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>{selectedApps.length} Apps {isEnterprise && <span className="text-green-400 text-xs ml-1">(Bundle Cap)</span>}</span>
                      <span>${totalAppCost}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className="flex justify-between text-green-400 font-medium">
                        <span>Yearly Discount</span>
                        <span>-20%</span>
                      </div>
                    )}
                    <div className="h-px bg-gray-800 my-2" />
                    <div className="flex justify-between items-end">
                      <span className="text-lg font-medium text-gray-200">Total / Month</span>
                      <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        ${finalPrice.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <Link href="/register" className="block">
                    <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 mt-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                      Start Free Trial
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-gray-500 mt-4">
                    14-day free trial. No credit card required.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Resources() {
  return (
    <section id="resources" className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-full border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium">
            Learn & Grow
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Resources to Help You Succeed</h2>
          <p className="text-lg text-gray-600">
            Everything you need to get the most out of SLICT ERP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {RESOURCES_DATA.map((resource, i) => (
            <motion.a
              key={i}
              href={resource.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-purple-900/5 transition-all duration-300 flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-300 shrink-0">
                <resource.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">{resource.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{resource.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 ml-auto self-center group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-32 bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Ready to transform your business?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of companies using SLICT ERP to streamline operations and drive growth. Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-16 px-10 text-lg bg-white text-gray-900 hover:bg-blue-50 hover:text-blue-700 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 font-semibold">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-gray-700 text-white hover:bg-gray-800 hover:border-gray-600 rounded-full transition-all active:scale-95">
                Contact Sales
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white pt-24 pb-12 border-t border-gray-100">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">SLICT<span className="text-blue-600">ERP</span></span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs">
              The most complete multi-tenant ERP solution for modern enterprises.
              Simplify your operations with our AI-powered suite.
            </p>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <a href="mailto:team@slict.lk" className="hover:text-blue-600 transition-colors">team@slict.lk</a>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <a href="https://wa.me/94752539988" className="hover:text-blue-600 transition-colors">WhatsApp: +94 75 253 9988</a>
              </div>
            </div>
          </div>

          {[
            {
              title: "Product",
              links: [
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Solutions", href: "#solutions" },
                { label: "Changelog", href: "#" }
              ]
            },
            {
              title: "Company",
              links: [
                { label: "About Us", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Contact", href: "/contact" }
              ]
            },
            {
              title: "Resources",
              links: [
                { label: "Documentation", href: "#" },
                { label: "Help Center", href: "#" },
                { label: "Community", href: "#" },
                { label: "API Reference", href: "#" }
              ]
            },
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-gray-900 mb-6 text-base">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith('#')) {
                          e.preventDefault();
                          const id = link.href.substring(1);
                          const element = document.getElementById(id);
                          if (element) {
                            const offset = 80;
                            const bodyRect = document.body.getBoundingClientRect().top;
                            const elementRect = element.getBoundingClientRect().top;
                            const elementPosition = elementRect - bodyRect;
                            const offsetPosition = elementPosition - offset;

                            window.scrollTo({
                              top: offsetPosition,
                              behavior: 'smooth'
                            });
                          }
                        }
                      }}
                      className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center hover:translate-x-1 duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} SLICT ERP. All rights reserved.</p>
          <div className="flex gap-6">
            {[Globe, MessageSquare, Mail].map((Icon, i) => (
              <a key={i} href="#" className="text-gray-400 hover:text-blue-600 transition-colors transform hover:scale-110">
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Prevent flash of landing page content while redirecting
  if (status === 'authenticated') {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <main className="min-h-screen bg-white font-sans selection:bg-blue-100">
      <Navbar />
      <Hero />
      <Stats />
      <Solutions />
      <AppExplorer />
      <PricingCalculator />
      <Resources />
      <CTA />
      <Footer />
    </main>
  );
}
