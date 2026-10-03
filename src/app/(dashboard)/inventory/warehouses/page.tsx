'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { WarehouseForm } from '@/components/inventory/WarehouseForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Building2, Search, MapPin, Phone, Mail, PlusCircle, Pencil, Trash2, Warehouse } from 'lucide-react';
import { useModuleAccess } from '@/hooks/useModulePermissions';
import { toast } from 'sonner';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { canEdit, canDelete } = useModuleAccess('inventory');

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/inventory/warehouses');
      if (response.ok) {
        setWarehouses(await response.json());
      } else {
        setError('Failed to load warehouses');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) =>
      (w.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.code ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.city ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [warehouses, searchTerm]);

  const handleCreateWarehouse = async (data: any) => {
    try {
      const response = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadWarehouses();
        setIsSheetOpen(false);
      } else {
        toast.error('Failed to create warehouse');
      }
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      toast.error(error.message || 'Error creating warehouse');
    }
  };

  const handleUpdateWarehouse = async (data: any) => {
    if (!selectedWarehouse) return;
    try {
      const response = await fetch(`/api/inventory/warehouses/${selectedWarehouse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadWarehouses();
        setIsSheetOpen(false);
      } else {
        toast.error('Failed to update warehouse');
      }
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      toast.error(error.message || 'Error updating warehouse');
    }
  };

  const handleDeleteWarehouse = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to decommission this facility?')) return;
    try {
      const response = await fetch(`/api/inventory/warehouses/${warehouseId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadWarehouses();
      } else {
        alert('Failed to decommission warehouse');
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
    }
  };

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const openSheet = (warehouse?: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSelectedWarehouse(warehouse || null);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSelectedWarehouse(null);
      timeoutRef.current = null;
    }, 300);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Facilities & Sites</h1>
          <p className="text-gray-500">Manage warehouses, distribution centers, and storage yards.</p>
        </div>
        {canEdit && (
          <Button onClick={() => openSheet()} className="bg-indigo-600 hover:bg-indigo-700">
            <Building2 className="h-4 w-4 mr-2" />
            Commission New Site
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by facility name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-gray-50/50 border-gray-200"
          />
        </div>
        <div className="text-sm text-gray-500 font-medium ml-auto">
          {filteredWarehouses.length} physical {filteredWarehouses.length === 1 ? 'site' : 'sites'} found
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" role="status" aria-label="Loading warehouses" />
        </div>
      ) : error ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <p className="text-rose-500 font-medium">{error}</p>
          <Button variant="outline" onClick={loadWarehouses}>Retry</Button>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-4 bg-white rounded-xl border border-dashed border-gray-200">
          <Warehouse className="h-12 w-12 text-gray-300" />
          <p>No facilities match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWarehouses.map((wh) => (
            <Card key={wh.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200/60 group flex flex-col">
              <CardHeader className="bg-gradient-to-br from-indigo-50 to-blue-50/10 border-b border-gray-100 pb-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-indigo-100 text-indigo-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900 group-hover:text-indigo-700 transition-colors">{wh.name}</CardTitle>
                      <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{wh.code}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={wh.isActive ? 'default' : 'secondary'} className={wh.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-none' : ''}>
                    {wh.isActive ? 'Operational' : 'Offline'}
                  </Badge>
                  {wh.isDefault && (
                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 font-semibold shadow-none">
                      Master Node
                    </Badge>
                  )}
                </div>

                <div className="space-y-2.5 mt-4">
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-600 leading-tight">
                      {wh.address ? `${wh.address}${wh.city ? `, ${wh.city}` : ''}${wh.country ? `, ${wh.country}` : ''}` : 'No address provided'}
                    </span>
                  </div>
                  {(wh.phone || wh.email) && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-500 border-t border-gray-100 pt-3">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{wh.phone || '—'}</span>
                      <span className="text-gray-300">|</span>
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{wh.email || '—'}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              {canEdit && (
                <CardFooter className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => openSheet(wh)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {canDelete && (
                    <Button variant="outline" size="sm" className="h-8 shadow-sm hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200" onClick={() => handleDeleteWarehouse(wh.id)} aria-label="Delete warehouse">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        if (!open) closeSheet();
        else setIsSheetOpen(true);
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-gray-50 sm:rounded-l-2xl border-l border-gray-200">
          <SheetHeader className="pb-6 mb-6 border-b border-gray-200">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
              {selectedWarehouse ? <Pencil className="h-5 w-5 text-indigo-600" /> : <PlusCircle className="h-5 w-5 text-indigo-600" />}
              {selectedWarehouse ? 'Retrofit Facility' : 'Commission Facility'}
            </SheetTitle>
          </SheetHeader>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <WarehouseForm
              initialData={selectedWarehouse || undefined}
              onSubmit={selectedWarehouse ? handleUpdateWarehouse : handleCreateWarehouse}
              onCancel={closeSheet}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
