"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, XCircle, ArrowRightLeft, FileText, CalendarClock, Loader2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuotationView } from "@/components/sales/QuotationView";

interface SalesQuoteV2 {
  id: string;
  quoteNumber: string;
  status: string;
  approvalStatus?: string;
  customerId?: string | null;
  customerAccountId?: string | null;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
  } | null;
  customerName?: string;
  opportunityId?: string | null;
  currency?: string;
  validUntil?: Date | null;
  grandTotal: number;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  revisionNo?: number;
  lines?: Array<any>;
  createdAt: Date;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

export default function SalesQuotesPage() {
  const [quotes, setQuotes] = useState<SalesQuoteV2[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'SENT' | 'CONVERTIBLE' | 'CONVERTED'>('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewingQuote, setViewingQuote] = useState<SalesQuoteV2 | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [newQuoteForm, setNewQuoteForm] = useState({
    customerId: "",
    currency: "USD",
    notes: "",
    validUntil: "",
    lines: [{ description: "", quantity: "1", unitPrice: "", discount: "0", tax: "0" }],
  });

  useEffect(() => {
    loadQuotes();
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const res = await fetch("/api/settings/company");
      if (res.ok) {
        const data = await res.json();
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error("Failed to load company info:", error);
    }
  };

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sales/quotes");
      if (response.ok) {
        const payload = await response.json();
        const items = payload.items || payload.data || (Array.isArray(payload) ? payload : []);
        setQuotes(items.map((q: any) => ({
          ...q,
          createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
          validUntil: q.validUntil ? new Date(q.validUntil) : null,
        })));
      }
    } catch (error) {
      console.error("Failed to load canonical quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || data.data || [];
        setCustomers(items);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleUpdateStatus = async (quoteId: string, status: string) => {
    try {
      const response = await fetch(`/api/sales/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await loadQuotes();
        setActionNotice(`Quote moved to ${status}`);
      }
    } catch (error) {
      console.error("Error updating quote status:", error);
    }
  };

  const handleConvertToOrder = async (quote: SalesQuoteV2) => {
    try {
      const response = await fetch(`/api/sales/quotes/${quote.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT", markQuoteStatus: "CONVERTED" }),
      });
      if (response.ok) {
        await loadQuotes();
        setActionNotice(`Quote ${quote.quoteNumber} converted to order`);
      }
    } catch (error) {
      console.error("Error converting quote:", error);
    }
  };

  const handleCreateQuote = async () => {
    if (!newQuoteForm.customerId) {
      setFormError("Please select a customer.");
      return;
    }
    const validLines = newQuoteForm.lines.filter(l => l.description.trim() && l.unitPrice);
    if (validLines.length === 0) {
      setFormError("At least one line item with description and unit price is required.");
      return;
    }
    try {
      setSubmitting(true); setFormError(null);
      const res = await fetch("/api/sales/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerAccountId: newQuoteForm.customerId,
          currency: newQuoteForm.currency,
          validUntil: newQuoteForm.validUntil || undefined,
          notes: newQuoteForm.notes.trim() || undefined,
          lines: validLines.map(l => ({
            description: l.description.trim(),
            quantity: Number(l.quantity) || 1,
            unitPrice: Number(l.unitPrice),
            discount: Number(l.discount) || 0,
            tax: Number(l.tax) || 0,
          })),
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "Failed to create quote"); }
      setShowAdd(false);
      setNewQuoteForm({ customerId: "", currency: "USD", notes: "", validUntil: "", lines: [{ description: "", quantity: "1", unitPrice: "", discount: "0", tax: "0" }] });
      await loadQuotes();
      setActionNotice("New quote created successfully");
    } catch (err: any) { setFormError(err?.message || "Failed to create quote."); }
    finally { setSubmitting(false); }
  };

  const addLineItem = () => {
    setNewQuoteForm(f => ({
      ...f,
      lines: [...f.lines, { description: "", quantity: "1", unitPrice: "", discount: "0", tax: "0" }],
    }));
  };

  const removeLineItem = (index: number) => {
    setNewQuoteForm(f => ({
      ...f,
      lines: f.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    setNewQuoteForm(f => ({
      ...f,
      lines: f.lines.map((line, i) => i === index ? { ...line, [field]: value } : line),
    }));
  };

  const filteredQuotes = quotes.filter((quote) => {
    const status = String(quote.status || "").toUpperCase();
    if (filter === "ALL") return true;
    if (filter === "CONVERTIBLE") return !["CONVERTED", "CANCELLED", "REJECTED", "EXPIRED"].includes(status);
    return status === filter;
  });

  return (
    <div className="space-y-6">
      {actionNotice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <CheckCircle2 className="h-4 w-4" />
          {actionNotice}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes Builder (V2)</h1>
          <p className="text-muted-foreground mt-2">
            Create, revise, and convert quotations into sales orders.
          </p>
        </div>
        <Button onClick={() => { setShowAdd(true); setFormError(null); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniKpi tone="slate" label="Total Quotes" value={String(quotes.length)} hint="All canonical records" />
        <MiniKpi
          tone="blue"
          label="Convertible"
          value={String(quotes.filter((q) => !["CONVERTED", "REJECTED", "EXPIRED", "CANCELLED"].includes(String(q.status).toUpperCase())).length)}
          hint="Ready for order generation"
        />
        <MiniKpi
          tone="amber"
          label="Expiring Soon"
          value={String(quotes.filter((q) => {
            if (!q.validUntil) return false;
            const t = new Date(q.validUntil).getTime();
            const now = Date.now();
            return t >= now && t <= now + 7 * 86400000 && !["CONVERTED", "EXPIRED"].includes(String(q.status).toUpperCase());
          }).length)}
          hint="Next 7 days"
        />
        <MiniKpi
          tone="indigo"
          label="Pipeline Value"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
            quotes.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0)
          )}
          hint="Sum of all quotes"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Quotations Directory</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "DRAFT", "SENT", "CONVERTIBLE", "CONVERTED"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center p-8 border-dashed border-2 rounded-lg bg-muted/20">
              <p className="text-muted-foreground text-sm">No canonical quotes found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => {
                const status = String(quote.status || "").toUpperCase();
                const approvalStatus = String(quote.approvalStatus || "").toUpperCase();
                const canConvert = !["CONVERTED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status);

                return (
                  <div key={quote.id} className="rounded-xl border border-gray-200 p-4 transition-all hover:shadow-sm bg-card">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{quote.quoteNumber}</p>
                          <Badge variant={status === "CONVERTED" ? "default" : status === "EXPIRED" ? "destructive" : "outline"}>
                            {status}
                          </Badge>
                          {approvalStatus && <Badge variant="secondary">{approvalStatus}</Badge>}
                          {quote.revisionNo != null && <Badge variant="outline">Rev {quote.revisionNo}</Badge>}
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: quote.currency || "USD" }).format(Number(quote.grandTotal || 0))}
                        </div>
                        {quote.customerName && (
                          <div className="text-sm text-blue-600 font-medium">
                            {quote.customerName}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 rounded bg-muted px-2 py-1">
                            <FileText className="h-3 w-3" /> {(quote.lines || []).length} items
                          </span>
                          <span className="flex items-center gap-1 rounded bg-muted px-2 py-1">
                            <CalendarClock className="h-3 w-3" />
                            {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "No expiry"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                         <Button size="sm" variant="outline" onClick={() => setViewingQuote(quote)}>
                           <Eye className="mr-2 h-4 w-4" />
                           View
                         </Button>
                         <Button size="sm" variant="outline" disabled={status === "DRAFT"} onClick={() => handleUpdateStatus(quote.id, "DRAFT")}>
                           Draft
                         </Button>
                         <Button size="sm" variant="outline" disabled={status === "SENT"} onClick={() => handleUpdateStatus(quote.id, "SENT")}>
                           Sent
                         </Button>
                         <Button size="sm" disabled={!canConvert} onClick={() => handleConvertToOrder(quote)}>
                           <ArrowRightLeft className="mr-2 h-4 w-4" />
                           Convert to Order
                         </Button>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Quotation View */}
      <QuotationView
        quotation={viewingQuote}
        open={!!viewingQuote}
        onClose={() => setViewingQuote(null)}
        company={companyInfo}
      />

      {/* New Quote Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) setFormError(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
            <DialogDescription>Create a new quotation with line items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
             {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}

             {/* Customer & Details */}
             <div className="space-y-1.5">
               <Label htmlFor="q-customer">Customer *</Label>
               <Select value={newQuoteForm.customerId} onValueChange={v => setNewQuoteForm(f => ({ ...f, customerId: v }))}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select a customer" />
                 </SelectTrigger>
                 <SelectContent>
                   {customers.length === 0 ? (
                     <SelectItem value="" disabled>No customers found</SelectItem>
                   ) : (
                     customers.map((customer) => (
                       <SelectItem key={customer.id} value={customer.id}>
                         {customer.name}{customer.company ? ` (${customer.company})` : ""}
                       </SelectItem>
                     ))
                   )}
                 </SelectContent>
               </Select>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <Label>Currency</Label>
                 <Select value={newQuoteForm.currency} onValueChange={v => setNewQuoteForm(f => ({ ...f, currency: v }))}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="USD">USD</SelectItem>
                     <SelectItem value="LKR">LKR</SelectItem>
                     <SelectItem value="EUR">EUR</SelectItem>
                     <SelectItem value="GBP">GBP</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label htmlFor="q-valid">Valid Until</Label>
                 <Input id="q-valid" type="date" value={newQuoteForm.validUntil}
                   onChange={e => setNewQuoteForm(f => ({ ...f, validUntil: e.target.value }))} />
               </div>
             </div>

             {/* Line Items */}
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <Label className="text-base font-semibold">Line Items</Label>
                 <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                   <Plus className="mr-1 h-3 w-3" /> Add Item
                 </Button>
               </div>

               {newQuoteForm.lines.map((line, index) => (
                 <div key={index} className="rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
                     {newQuoteForm.lines.length > 1 && (
                       <Button
                         type="button"
                         size="sm"
                         variant="ghost"
                         className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                         onClick={() => removeLineItem(index)}
                       >
                         <XCircle className="h-4 w-4" />
                       </Button>
                     )}
                   </div>
                   <div className="space-y-2">
                     <div>
                       <Label htmlFor={`line-desc-${index}`} className="text-xs">Description *</Label>
                       <Input
                         id={`line-desc-${index}`}
                         placeholder="Item description"
                         value={line.description}
                         onChange={e => updateLineItem(index, "description", e.target.value)}
                       />
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                       <div>
                         <Label htmlFor={`line-qty-${index}`} className="text-xs">Qty</Label>
                         <Input
                           id={`line-qty-${index}`}
                           type="number"
                           min="0.01"
                           step="0.01"
                           placeholder="1"
                           value={line.quantity}
                           onChange={e => updateLineItem(index, "quantity", e.target.value)}
                         />
                       </div>
                       <div>
                         <Label htmlFor={`line-price-${index}`} className="text-xs">Unit Price *</Label>
                         <Input
                           id={`line-price-${index}`}
                           type="number"
                           min="0"
                           step="0.01"
                           placeholder="0.00"
                           value={line.unitPrice}
                           onChange={e => updateLineItem(index, "unitPrice", e.target.value)}
                         />
                       </div>
                       <div>
                         <Label htmlFor={`line-discount-${index}`} className="text-xs">Disc %</Label>
                         <Input
                           id={`line-discount-${index}`}
                           type="number"
                           min="0"
                           max="100"
                           step="0.01"
                           placeholder="0"
                           value={line.discount}
                           onChange={e => updateLineItem(index, "discount", e.target.value)}
                         />
                       </div>
                       <div>
                         <Label htmlFor={`line-tax-${index}`} className="text-xs">Tax %</Label>
                         <Input
                           id={`line-tax-${index}`}
                           type="number"
                           min="0"
                           max="100"
                           step="0.01"
                           placeholder="0"
                           value={line.tax}
                           onChange={e => updateLineItem(index, "tax", e.target.value)}
                         />
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>

             <div className="space-y-1.5">
               <Label htmlFor="q-notes">Notes</Label>
               <Input id="q-notes" placeholder="Optional terms or remarks" value={newQuoteForm.notes}
                 onChange={e => setNewQuoteForm(f => ({ ...f, notes: e.target.value }))} />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
             <Button onClick={handleCreateQuote} disabled={submitting}>
               {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : "Create Quote"}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniKpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "slate" | "blue" | "amber" | "indigo" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-90">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs opacity-80 mt-1">{hint}</p>
    </div>
  );
}
