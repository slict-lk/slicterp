'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductForm } from '@/components/inventory/ProductForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertCircle, ArrowUpDown, Barcode, Boxes, PackagePlus, Pencil, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/useModulePermissions';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { canEdit, canDelete } = useModuleAccess('inventory');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/inventory/products'),
        fetch('/api/inventory/categories?includeChildren=true')
      ]);
      if (prodRes.ok) {
        const result = await prodRes.json();
        setProducts(result.data || result || []);
      } else {
        console.error('Failed to load products:', prodRes.statusText);
      }
      if (catRes.ok) {
        const catResult = await catRes.json();
        setCategories(catResult.data || []);
      } else {
        console.error('Failed to load categories:', catRes.statusText);
      }
    } catch (error) {
      console.error('Failed to load catalog data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = (p.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, filterType]);

  const handleCreateProduct = async (data: any) => {
    try {
      const response = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadData();
        setIsSheetOpen(false);
      } else {
        alert('Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleUpdateProduct = async (data: any) => {
    if (!selectedProduct) return;
    try {
      const response = await fetch(`/api/inventory/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadData();
        setIsSheetOpen(false);
      } else {
        alert('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`/api/inventory/products/${productId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadData();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const openEditSheet = (product?: any) => {
    setSelectedProduct(product || null);
    setIsSheetOpen(true);
  };

  const typeConfig: Record<string, { color: string, label: string }> = {
    STORABLE: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Storable' },
    CONSUMABLE: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Consumable' },
    SERVICE: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Service' }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Master Catalog</h1>
          <p className="text-gray-500">Manage all internal products, services, and raw materials</p>
        </div>
        {canEdit && (
          <Button onClick={() => openEditSheet()} className="bg-indigo-600 hover:bg-indigo-700">
            <PackagePlus className="h-4 w-4 mr-2" />
            Add New Item
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardHeader className="bg-white/50 border-b border-gray-50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg border border-gray-200/60">
              {['ALL', 'STORABLE', 'CONSUMABLE', 'SERVICE'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filterType === type ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:bg-gray-200/50'}`}
                >
                  {type === 'ALL' ? 'All Types' : typeConfig[type].label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="relative overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[300px]">Product / Category</TableHead>
                    <TableHead>Identifiers</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {canEdit && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 8 : 7} className="h-48 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Boxes className="h-10 w-10 text-gray-300" />
                          <p>No products found matching your search.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg shrink-0 mt-0.5 border border-indigo-100/50">
                            <Boxes className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{p.category?.name || 'Uncategorized'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="flex items-center gap-1.5 text-gray-600 font-mono text-xs bg-gray-100 w-fit px-1.5 py-0.5 rounded">
                            <Barcode className="h-3 w-3" /> {p.sku}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeConfig[p.type]?.color || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {typeConfig[p.type]?.label || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-600">
                        {canEdit ? formatCurrency(p.costPrice || 0) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatCurrency(p.listPrice || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.type !== 'SERVICE' ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-bold text-base ${p.qtyAvailable < 10 && p.type === 'STORABLE' ? 'text-rose-600' : 'text-gray-900'}`}>
                              {p.qtyAvailable}
                            </span>
                            {p.qtyReserved > 0 && <span className="text-xs text-amber-600">({p.qtyReserved} Rsv)</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.isActive ? 'default' : 'secondary'} className={p.isActive ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm' : ''}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex justify-end gap-2 pr-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => openEditSheet(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteProduct(p.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide-over for Create/Edit */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-gray-50 sm:rounded-l-2xl border-l border-gray-200">
          <SheetHeader className="pb-6 mb-6 border-b border-gray-200">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              {selectedProduct ? <Pencil className="h-5 w-5 text-indigo-600" /> : <PackagePlus className="h-5 w-5 text-indigo-600" />}
              {selectedProduct ? 'Edit Catalog Item' : 'New Catalog Item'}
            </SheetTitle>
          </SheetHeader>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <ProductForm
              initialData={selectedProduct ? {
                ...selectedProduct,
                canBeSold: selectedProduct.canBeSold ?? true,
                canBePurchased: selectedProduct.canBePurchased ?? true
              } : undefined}
              categories={categories}
              onSubmit={selectedProduct ? handleUpdateProduct : handleCreateProduct}
              onCancel={() => setIsSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
