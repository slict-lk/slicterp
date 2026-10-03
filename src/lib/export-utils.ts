/**
 * Data Export Utilities
 * Handles CSV, Excel, and PDF exports for various data types
 */

// CSV Export
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Excel Export (requires xlsx library)
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  console.log('Excel export would require xlsx library');
  console.log('Data to export:', data.length, 'rows');
  
  // Fallback to CSV for now
  exportToCSV(data, filename);
}

// PDF Export
export function exportToPDF(content: string, filename: string) {
  console.log('PDF export would require jsPDF or similar library');
  console.log('Creating PDF:', filename);
  
  // For now, just log the action
  alert('PDF export feature requires jsPDF library integration');
}

// Invoice PDF Export
export function exportInvoiceToPDF(invoice: any) {
  const content = `
Invoice #${invoice.invoiceNumber}
Customer: ${invoice.customer?.name}
Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

Items:
${invoice.lines.map((line: any) => 
  `- ${line.description}: ${line.quantity} x $${line.unitPrice} = $${line.quantity * line.unitPrice}`
).join('\n')}

Total: $${invoice.total}
  `;
  
  exportToPDF(content, `invoice-${invoice.invoiceNumber}`);
}

// Quotation PDF Export
export function exportQuotationToPDF(quotation: any) {
  const content = `
Quotation #${quotation.quotationNumber}
Customer: ${quotation.customer?.name}
Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}

Items:
${quotation.lines.map((line: any) => 
  `- ${line.description}: ${line.quantity} x $${line.unitPrice}`
).join('\n')}

Total: $${quotation.total}
  `;
  
  exportToPDF(content, `quotation-${quotation.quotationNumber}`);
}

// Generic data table export
export function exportDataTable(data: any[], filename: string, format: 'csv' | 'excel' = 'csv') {
  if (format === 'excel') {
    exportToExcel(data, filename);
  } else {
    exportToCSV(data, filename);
  }
}

// Format data for export (flatten nested objects)
export function flattenForExport(data: any[]): any[] {
  return data.map(item => {
    const flattened: any = {};
    
    Object.keys(item).forEach(key => {
      if (item[key] && typeof item[key] === 'object' && !Array.isArray(item[key]) && !(item[key] instanceof Date)) {
        // Flatten nested objects
        Object.keys(item[key]).forEach(nestedKey => {
          flattened[`${key}_${nestedKey}`] = item[key][nestedKey];
        });
      } else if (item[key] instanceof Date) {
        flattened[key] = item[key].toISOString();
      } else if (Array.isArray(item[key])) {
        flattened[key] = item[key].length;
      } else {
        flattened[key] = item[key];
      }
    });
    
    return flattened;
  });
}

// Export functions for specific modules
export const exportCustomers = (customers: any[]) => 
  exportToCSV(flattenForExport(customers), 'customers-export');

export const exportInvoices = (invoices: any[]) => 
  exportToCSV(flattenForExport(invoices), 'invoices-export');

export const exportProducts = (products: any[]) => 
  exportToCSV(flattenForExport(products), 'products-export');

export const exportEmployees = (employees: any[]) => 
  exportToCSV(flattenForExport(employees), 'employees-export');

export const exportOrders = (orders: any[]) => 
  exportToCSV(flattenForExport(orders), 'orders-export');
