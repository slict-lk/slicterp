"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(inv =>
    inv.number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.vendor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Modal Data
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Record Payment Dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'CASH',
    reference: '',
    periodId: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  // Invoice Detail Dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const emptyLine = { description: '', quantity: 1, unitPrice: 0, tax: 0 };

  const [formData, setFormData] = useState({
    type: 'SALES',
    number: '', // TODO: Replace with server-driven sequence
    customerId: '',
    vendorId: '',
    periodId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lines: [{ ...emptyLine }],
    notes: ''
  });

  // Computed totals from lines
  const subtotal = formData.lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0);
  const totalTax = formData.lines.reduce((sum, l) => {
    const lineSub = (l.quantity || 0) * (l.unitPrice || 0);
    return sum + (lineSub * (l.tax || 0)) / 100;
  }, 0);
  const total = subtotal + totalTax;

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({ ...formData, lines: [...formData.lines, { ...emptyLine }] });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 1) return;
    setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/accounting/invoices');
      if (res.ok) setInvoices(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const res = await fetch('/api/accounting/invoices/next-number');
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, number: data.number }));
      }
    } catch (error) {
      console.error('Failed to fetch next invoice number:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchNextInvoiceNumber();

    async function fetchLookups() {
      try {
        const [pRes, cRes, vRes] = await Promise.all([
          fetch('/api/accounting/periods'),
          fetch('/api/sales/customers'),
          fetch('/api/purchasing/vendors')
        ]);
        if (pRes.ok) {
          const data = await pRes.json();
          setPeriods(data.filter((p: any) => p.status === 'OPEN'));
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          // Handle paginated response { data: [...] } or flat array
          const customersList = Array.isArray(cData) ? cData : (cData.data || []);
          setCustomers(customersList);
        }
        if (vRes.ok) {
          const vData = await vRes.json();
          const vendorsList = Array.isArray(vData) ? vData : (vData.data || []);
          setVendors(vendorsList);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchLookups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.periodId) return alert("Please select an open accounting period.");
    if (formData.type === 'SALES' && !formData.customerId) return alert("Please select a customer.");
    if (formData.type === 'PURCHASE' && !formData.vendorId) return alert("Please select a vendor.");
    if (formData.lines.every(l => !l.description)) return alert("Please add at least one line item.");
    const invalidLine = formData.lines.find(l => l.description && (Number(l.quantity) <= 0 || !Number.isFinite(Number(l.quantity)) || Number(l.unitPrice) <= 0 || !Number.isFinite(Number(l.unitPrice))));
    if (invalidLine) return alert("Each line item must have a positive quantity and unit price.");

    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          issueDate: new Date(`${formData.issueDate}T12:00:00Z`).toISOString(),
          dueDate: new Date(`${formData.dueDate}T12:00:00Z`).toISOString(),
          subtotal,
          tax: totalTax,
          total,
          status: 'OPEN',
          lines: formData.lines.filter(l => l.description).map(l => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            tax: Number(l.tax),
            total: Number(l.quantity) * Number(l.unitPrice) * (1 + Number(l.tax) / 100),
          })),
        })
      });

      if (res.ok) {
        setIsOpen(false);
        setFormData({
          type: 'SALES',
          number: '', // Will be re-fetched soon
          customerId: '',
          vendorId: '',
          periodId: '',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          lines: [{ ...emptyLine }],
          notes: ''
        });
        fetchInvoices();
        fetchNextInvoiceNumber();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create invoice");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // === Action Handlers ===
  const handleStatusChange = async (invoiceId: string, newStatus: string, label: string) => {
    if (!confirm(`Are you sure you want to ${label} this invoice?`)) return;
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/accounting/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchInvoices();
      } else {
        const err = await res.json();
        alert(err.error || `Failed to ${label}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to ${label}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = async (invoice: any) => {
    setDetailLoading(true);
    setDetailDialogOpen(true);
    try {
      const res = await fetch(`/api/accounting/invoices/${invoice.id}`);
      if (res.ok) {
        setInvoiceDetail(await res.json());
      } else {
        alert('Failed to load invoice details');
        setDetailDialogOpen(false);
      }
    } catch {
      alert('Failed to load invoice details');
      setDetailDialogOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openPaymentDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: Number(invoice.amountDue) || 0,
      method: 'CASH',
      reference: '',
      periodId: periods.length > 0 ? periods[0].id : '',
      paymentDate: new Date().toISOString().split('T')[0],
    });
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentData.periodId) {
      alert('Please select an accounting period');
      return;
    }
    if (paymentData.amount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }
    if (paymentData.amount > Number(selectedInvoice.amountDue)) {
      alert('Payment amount cannot exceed the amount due');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: paymentData.amount,
          method: paymentData.method,
          reference: paymentData.reference,
          periodId: paymentData.periodId,
          paymentDate: paymentData.paymentDate,
        })
      });
      if (res.ok) {
        setPaymentDialogOpen(false);
        setSelectedInvoice(null);
        fetchInvoices();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueCreditNote = async (invoiceId: string) => {
    if (periods.length === 0) {
      alert('No open accounting periods available. Please create one first.');
      return;
    }
    if (!confirm('Are you sure you want to issue a credit note for this invoice?')) return;
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/accounting/invoices/${invoiceId}/credit-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: periods[0].id })
      });
      if (res.ok) {
        fetchInvoices();
        alert('Credit note issued successfully');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to issue credit note');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to issue credit note');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async (invoice: any) => {
    try {
      // Fetch full details
      const res = await fetch(`/api/accounting/invoices/${invoice.id}`);
      if (!res.ok) { alert('Failed to load invoice'); return; }
      const inv = await res.json();

      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(30, 58, 138); // blue-900
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('SLICT', 14, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Enterprise Suite', 14, 28);

      // Invoice title
      doc.setFontSize(16);
      doc.text(inv.type === 'CREDIT_NOTE' ? 'CREDIT NOTE' : 'INVOICE', pageWidth - 14, 20, { align: 'right' });
      doc.setFontSize(10);
      doc.text(`#${inv.number}`, pageWidth - 14, 28, { align: 'right' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Invoice meta
      let y = 52;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.status, 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Issue Date:', 100, y);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(inv.issueDate), 'MMM dd, yyyy'), 130, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Type:', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.type, 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Due Date:', 100, y);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(inv.dueDate), 'MMM dd, yyyy'), 130, y);

      // Customer/Vendor
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(inv.type === 'SALES' ? 'Bill To:' : 'Vendor:', 14, y);
      doc.setFont('helvetica', 'normal');
      const partyName = inv.type === 'SALES' ? inv.customer?.name : inv.vendor?.name;
      doc.text(partyName || 'N/A', 14, y + 6);

      // Line items table
      y += 16;
      const tableRows = (inv.lines || []).map((line: any) => [
        line.description || '',
        Number(line.quantity).toString(),
        Number(line.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 }),
        `${Number(line.tax || 0)}%`,
        Number(line.total).toLocaleString('en-LK', { minimumFractionDigits: 2 }),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Qty', 'Unit Price', 'Tax %', 'Total']],
        body: tableRows.length > 0 ? tableRows : [['No line items', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
      let ty = finalY + 10;
      const rightCol = pageWidth - 14;
      const labelX = rightCol - 60;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', labelX, ty);
      doc.text(`LKR ${Number(inv.subtotal).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, rightCol, ty, { align: 'right' });
      ty += 6;
      doc.text('Tax:', labelX, ty);
      doc.text(`LKR ${Number(inv.tax).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, rightCol, ty, { align: 'right' });
      ty += 6;
      if (Number(inv.discount) > 0) {
        doc.text('Discount:', labelX, ty);
        doc.text(`LKR ${Number(inv.discount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, rightCol, ty, { align: 'right' });
        ty += 6;
      }
      doc.setDrawColor(200);
      doc.line(labelX, ty - 2, rightCol, ty - 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Total:', labelX, ty + 4);
      doc.text(`LKR ${Number(inv.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, rightCol, ty + 4, { align: 'right' });

      ty += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Amount Paid:', labelX, ty);
      doc.text(`LKR ${Number(inv.amountPaid).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, rightCol, ty, { align: 'right' });
      ty += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Balance Due:', labelX, ty);
      doc.text(`LKR ${Number(inv.amountDue).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, rightCol, ty, { align: 'right' });

      // Notes
      if (inv.notes) {
        ty += 14;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Notes:', 14, ty);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(inv.notes, pageWidth - 28);
        doc.text(splitNotes, 14, ty + 6);
      }

      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text('Generated by SLICT ERP', 14, pageH - 10);
      doc.text(format(new Date(), 'MMM dd, yyyy HH:mm'), pageWidth - 14, pageH - 10, { align: 'right' });

      doc.save(`${inv.number}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case 'PAID': return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case 'OVERDUE': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case 'DRAFT': return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
      case 'VOID': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case 'VOIDED': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case 'CANCELLED': return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const openCount = invoices.filter(i => i.status === 'OPEN').length;
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <span className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            Invoices
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create, track, and manage all your receivables and payables.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Create a sales or purchase invoice. It will be posted directly to the ledger.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={val => setFormData({ ...formData, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALES">Sales Invoice (AR)</SelectItem>
                        <SelectItem value="PURCHASE">Purchase Bill (AP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="number">Invoice Number</Label>
                    <Input
                      id="number"
                      required
                      value={formData.number}
                      onChange={e => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="periodId">Accounting Period</Label>
                    <Select
                      value={formData.periodId}
                      onValueChange={val => setFormData({ ...formData, periodId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.length === 0 && <SelectItem value="none" disabled>No open periods</SelectItem>}
                        {periods.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type === 'SALES' ? (
                    <div className="grid gap-2">
                      <Label htmlFor="customerId">Customer</Label>
                      <Select
                        value={formData.customerId}
                        onValueChange={val => setFormData({ ...formData, customerId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.length === 0 && <SelectItem value="none" disabled>No customers found</SelectItem>}
                          {Array.isArray(customers) && customers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name || c.companyName || 'Unnamed'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="vendorId">Vendor</Label>
                      <Select
                        value={formData.vendorId}
                        onValueChange={val => setFormData({ ...formData, vendorId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.length === 0 && <SelectItem value="none" disabled>No vendors found</SelectItem>}
                          {Array.isArray(vendors) && vendors.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name || v.companyName || 'Unnamed'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Invoice Line Items */}
                <div className="mt-2 border rounded-lg">
                  <div className="flex items-center justify-between p-3 border-b bg-slate-50 dark:bg-slate-900 rounded-t-lg">
                    <Label className="text-sm font-semibold">Invoice Line Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-3 w-3 mr-1" /> Add Line
                    </Button>
                  </div>

                  <div className="divide-y">
                    {formData.lines.map((line, idx) => (
                      <div key={idx} className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                          {formData.lines.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => removeLine(idx)}>
                              ×
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <Label className="text-xs">Description</Label>
                            <Input
                              placeholder="Item description"
                              value={line.description}
                              onChange={e => updateLine(idx, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.quantity || ''}
                              onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice || ''}
                              onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-xs">Tax %</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={line.tax || ''}
                              onChange={e => updateLine(idx, 'tax', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2 flex flex-col justify-end">
                            <Label className="text-xs text-right">Line Total</Label>
                            <div className="h-10 px-2 flex items-center justify-end text-sm font-semibold">
                              {formatCurrency((line.quantity || 0) * (line.unitPrice || 0) * (1 + (line.tax || 0) / 100), 'LKR')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="p-3 border-t bg-slate-50 dark:bg-slate-900 rounded-b-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(subtotal, 'LKR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(totalTax, 'LKR')}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-1">
                      <span className="text-blue-600 dark:text-blue-400">Total:</span>
                      <span>{formatCurrency(total, 'LKR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting || !formData.periodId || total <= 0}>
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>{invoices.length} total • {openCount} open • {overdueCount} overdue</CardDescription>
            </div>
            <div className="relative w-full sm:w-[280px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Balance</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">Loading invoices...</TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No invoices found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No invoices match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv: any) => (
                    <TableRow key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(inv.issueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">{inv.number}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {inv.type === 'SALES' ? inv.customer?.name : inv.vendor?.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-gray-500 uppercase">{inv.type?.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {inv.journalEntry?.sourceModule ? (
                          <Badge variant="outline" className="capitalize text-slate-600 bg-slate-50 border-slate-200 text-[10px]">
                            {inv.journalEntry.sourceModule.replaceAll('-', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Manual</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getStatusColor(inv.status)} text-[10px] uppercase`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(inv.total, inv.currencyCode || 'LKR')}</TableCell>
                      <TableCell className="text-right text-sm font-semibold hidden sm:table-cell">{formatCurrency(inv.amountDue, inv.currencyCode || 'LKR')}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(inv)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPdf(inv)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {inv.status === 'OPEN' && (
                              <>
                                <DropdownMenuItem onClick={() => openPaymentDialog(inv)}>
                                  Record Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleIssueCreditNote(inv.id)}>
                                  Issue Credit Note
                                </DropdownMenuItem>
                              </>
                            )}
                            {inv.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'OPEN', 'finalize')}>
                                Finalize &amp; Post
                              </DropdownMenuItem>
                            )}
                            {(inv.status === 'DRAFT' || inv.status === 'OPEN') && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleStatusChange(inv.id, 'VOID', 'void')}
                              >
                                Void Invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {invoiceDetail ? `Invoice ${invoiceDetail.number}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-gray-500">Loading invoice details...</div>
          ) : invoiceDetail ? (
            <div className="space-y-4">
              {/* Invoice Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Invoice #:</span>
                  <span className="ml-2 font-mono font-medium">{invoiceDetail.number}</span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2">{invoiceDetail.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge variant="outline" className={`ml-2 ${getStatusColor(invoiceDetail.status)} text-[10px] uppercase`}>
                    {invoiceDetail.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Issue Date:</span>
                  <span className="ml-2">{format(new Date(invoiceDetail.issueDate), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-gray-500">Due Date:</span>
                  <span className="ml-2">{format(new Date(invoiceDetail.dueDate), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-gray-500">{invoiceDetail.type === 'SALES' ? 'Customer' : 'Vendor'}:</span>
                  <span className="ml-2 font-medium">
                    {invoiceDetail.type === 'SALES'
                      ? invoiceDetail.customer?.name || '—'
                      : invoiceDetail.vendor?.name || '—'}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              {invoiceDetail.lines && invoiceDetail.lines.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Tax %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetail.lines.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">{Number(line.quantity)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unitPrice, 'LKR')}</TableCell>
                          <TableCell className="text-right">{Number(line.tax || 0)}%</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(line.total, 'LKR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatCurrency(invoiceDetail.subtotal, 'LKR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax:</span>
                  <span>{formatCurrency(invoiceDetail.tax, 'LKR')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(invoiceDetail.total, 'LKR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="text-green-600">{formatCurrency(invoiceDetail.amountPaid, 'LKR')}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Balance Due:</span>
                  <span className="text-red-600">{formatCurrency(invoiceDetail.amountDue, 'LKR')}</span>
                </div>
              </div>

              {/* Payments History */}
              {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Payments</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetail.payments.map((pay: any) => (
                        <TableRow key={pay.id}>
                          <TableCell>{format(new Date(pay.paymentDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{pay.method}</TableCell>
                          <TableCell>{pay.reference || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(pay.amount, 'LKR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {invoiceDetail.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{invoiceDetail.notes}</p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice
                ? `Record a payment for Invoice ${selectedInvoice.number} (Balance: ${formatCurrency(selectedInvoice.amountDue, 'LKR')})`
                : 'Record a payment'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                max={selectedInvoice?.amountDue || 0}
                value={paymentData.amount || ''}
                onChange={e => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentData.method}
                onValueChange={val => setPaymentData({ ...paymentData, method: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Accounting Period</Label>
              <Select
                value={paymentData.periodId}
                onValueChange={val => setPaymentData({ ...paymentData, periodId: val })}
              >
                <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  {periods.length === 0 && <SelectItem value="none" disabled>No open periods</SelectItem>}
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentData.paymentDate}
                onChange={e => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="e.g. bank ref, receipt no."
                value={paymentData.reference}
                onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRecordPayment}
              disabled={submitting || !paymentData.periodId || paymentData.amount <= 0}
            >
              {submitting ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
