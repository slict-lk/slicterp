"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Printer, FileText, Building2, Mail, Phone, MapPin, Calendar, Hash, User, CreditCard } from "lucide-react";

interface CompanyInfo {
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  taxId?: string;
  vatNumber?: string;
  logo?: string;
  legalName?: string;
  registrationNumber?: string;
}

interface QuotationLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  lineTotal: number;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  number?: string;
  status: string;
  createdAt: string | Date;
  validUntil?: string | Date | null;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
  } | null;
  customerName?: string;
  subtotal?: number;
  total?: number;
  grandTotal: number;
  discount?: number;
  tax?: number;
  taxTotal?: number;
  discountTotal?: number;
  currency?: string;
  notes?: string;
  termsAndConditions?: string;
  lines?: QuotationLine[];
  revisionNo?: number;
}

interface QuotationViewProps {
  quotation: Quotation | null;
  open: boolean;
  onClose: () => void;
  company?: CompanyInfo;
}

export function QuotationView({ quotation, open, onClose, company }: QuotationViewProps) {
  const [printing, setPrinting] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch the company logo as a data URL when dialog opens
  useEffect(() => {
    if (!open || !company?.logo) {
      setLogoDataUrl(null);
      return;
    }
    let cancelled = false;
    fetch('/api/settings/company/logo')
      .then(async (res) => {
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          if (!cancelled) setLogoDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => setLogoDataUrl(null));
    return () => { cancelled = true; };
  }, [open, company?.logo]);

  if (!quotation) return null;

  const currency = quotation.currency || "USD";
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const lines = quotation.lines || [];
  const subtotal = quotation.subtotal || lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
  const discountTotal = quotation.discountTotal || quotation.discount || 0;
  const taxTotal = quotation.taxTotal || quotation.tax || 0;
  const grandTotal = quotation.grandTotal || quotation.total || 0;
  const customerName = quotation.customer?.name || quotation.customerName || "Valued Customer";

  const handlePrint = () => {
    if (!printRef.current) return;
    setPrinting(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setPrinting(false);
      return;
    }

    const docContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation ${quotation.quoteNumber || quotation.number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 24px; margin-bottom: 24px; }
            .company { display: flex; gap: 16px; }
            .logo { width: 120px; height: 60px; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .logo svg { width: 32px; height: 32px; color: white; background: #2563eb; border-radius: 8px; padding: 12px; }
            .company-info h1 { font-size: 24px; font-weight: 700; }
            .company-info .tagline { font-size: 14px; color: #6b7280; }
            .company-info .contact { margin-top: 8px; font-size: 12px; color: #4b5563; line-height: 1.6; }
            .doc-title { text-align: right; }
            .doc-title h2 { font-size: 28px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 2px; }
            .doc-title .doc-number { font-size: 18px; font-weight: 600; margin-top: 4px; }
            .doc-title .revision { font-size: 12px; color: #6b7280; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
            .bill-to h3 { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .bill-to-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f9fafb; }
            .bill-to-box .name { font-weight: 600; font-size: 16px; }
            .bill-to-box .company { font-size: 14px; color: #4b5563; margin-top: 2px; }
            .bill-to-box .contact { font-size: 14px; color: #4b5563; margin-top: 2px; }
            .meta-items { display: flex; flex-direction: column; gap: 8px; }
            .meta-item { display: flex; justify-content: space-between; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; background: #f9fafb; }
            .meta-item .label { font-size: 14px; color: #6b7280; }
            .meta-item .value { font-size: 14px; font-weight: 500; }
            .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .status-DRAFT { background: #f3f4f6; color: #374151; }
            .status-SENT { background: #dbeafe; color: #1d4ed8; }
            .status-CONVERTED { background: #dcfce7; color: #16a34a; }
            .status-EXPIRED { background: #fee2e2; color: #dc2626; }
            .status-REJECTED { background: #fee2e2; color: #dc2626; }
            .status-CANCELLED { background: #f3f4f6; color: #374151; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
            thead tr { border-bottom: 2px solid #1a1a1a; }
            th { text-align: left; padding: 12px 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
            th:not(:first-child) { text-align: right; }
            tbody tr { border-bottom: 1px solid #f3f4f6; }
            td { padding: 12px 8px; font-size: 14px; }
            td:not(:first-child) { text-align: right; }
            td:first-child { color: #6b7280; }
            td:nth-child(2) { font-weight: 500; }
            .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
            .totals-inner { width: 288px; }
            .totals-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; }
            .totals-row.discount { color: #dc2626; }
            .totals-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 8px; margin-top: 8px; }
            .totals-row.grand .value { color: #2563eb; }
            .terms { border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px; }
            .terms h4 { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .terms p { font-size: 14px; color: #4b5563; white-space: pre-wrap; }
            .footer { border-top: 2px solid #1a1a1a; padding-top: 24px; margin-top: 32px; text-align: center; }
            .footer p { font-size: 12px; color: #9ca3af; margin-top: 4px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${docContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setPrinting(false);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-none print:p-0 print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quotation {quotation.quoteNumber || quotation.number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} disabled={printing}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Professional Quotation Document */}
        <div ref={printRef} className="bg-white p-8">
          {/* Header */}
          <div className="header">
            <div className="company">
              <div className="logo" style={{ width: '120px', height: '60px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: logoDataUrl ? 'transparent' : '#2563eb' }}>
                {logoDataUrl
                  ? <img src={logoDataUrl} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <Building2 className="h-8 w-8 text-white" />}
              </div>
              <div className="company-info">
                <h1>{company?.companyName || "Company Name"}</h1>
                <div className="contact">
                  {company?.address && <p>{company.address}</p>}
                  {company?.phone && <p>{company.phone}</p>}
                  {company?.email && <p>{company.email}</p>}
                  {company?.website && <p>{company.website}</p>}
                </div>
              </div>
            </div>
            <div className="doc-title">
              <h2>Quotation</h2>
              <p className="doc-number">{quotation.quoteNumber || quotation.number}</p>
              {quotation.revisionNo != null && (
                <p className="revision">Revision {quotation.revisionNo}</p>
              )}
            </div>
          </div>

          {/* Bill To & Quote Details */}
          <div className="details-grid">
            <div className="bill-to">
              <h3>Bill To</h3>
              <div className="bill-to-box">
                <p className="name">{customerName}</p>
                {quotation.customer?.company && (
                  <p className="company">{quotation.customer.company}</p>
                )}
                {quotation.customer?.email && (
                  <p className="contact">{quotation.customer.email}</p>
                )}
                {quotation.customer?.phone && (
                  <p className="contact">{quotation.customer.phone}</p>
                )}
                {quotation.customer?.address && (
                  <p className="contact">{quotation.customer.address}</p>
                )}
              </div>
            </div>
            <div className="meta-items">
              <div className="meta-item">
                <span className="label">Date Issued</span>
                <span className="value">{formatDate(quotation.createdAt)}</span>
              </div>
              <div className="meta-item">
                <span className="label">Valid Until</span>
                <span className="value">{formatDate(quotation.validUntil)}</span>
              </div>
              <div className="meta-item">
                <span className="label">Status</span>
                <span className="value">
                  <span className={`status-badge status-${quotation.status}`}>{quotation.status}</span>
                </span>
              </div>
              <div className="meta-item">
                <span className="label">Currency</span>
                <span className="value">{currency}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                    No line items
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <tr key={line.id || index}>
                    <td>{index + 1}</td>
                    <td>{line.description}</td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitPrice)}</td>
                    <td>{line.discount || 0}%</td>
                    <td>{line.tax || 0}%</td>
                    <td>{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals">
            <div className="totals-inner">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="totals-row discount">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="totals-row">
                  <span>Tax</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="totals-row grand">
                <span>Total</span>
                <span className="value">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          {(quotation.termsAndConditions || quotation.notes) && (
            <div className="terms">
              {quotation.termsAndConditions && (
                <div>
                  <h4>Terms & Conditions</h4>
                  <p>{quotation.termsAndConditions}</p>
                </div>
              )}
              {quotation.notes && (
                <div>
                  <h4>Notes</h4>
                  <p>{quotation.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>
              This quotation is valid until {formatDate(quotation.validUntil)}.
              Payment terms: Net 30 days. Please reference the quotation number when making payment.
            </p>
            {company?.legalName && (
              <p>
                {company.legalName}
                {company.registrationNumber && ` | Reg No: ${company.registrationNumber}`}
                {company.taxId && ` | Tax ID: ${company.taxId}`}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
