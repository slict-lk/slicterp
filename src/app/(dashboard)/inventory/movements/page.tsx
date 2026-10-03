'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, History, ArrowDownToLine, ArrowUpFromLine, Layers, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { StockTransferModal } from '@/components/inventory/StockTransferModal';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/stock');
      if (res.ok) {
        setMovements(await res.json());
      } else {
        setError(`Failed to load movements: ${res.statusText}`);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    if (!searchTerm) return movements;
    const lower = searchTerm.toLowerCase();
    return movements.filter(m =>
      m.product?.name?.toLowerCase().includes(lower) ||
      m.product?.sku?.toLowerCase().includes(lower) ||
      m.sourceModule?.toLowerCase().includes(lower) ||
      m.reference?.toLowerCase().includes(lower) ||
      m.type?.toLowerCase().includes(lower)
    );
  }, [movements, searchTerm]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <History className="h-8 w-8 text-indigo-600" />
            Stock Movement Audit Log
          </h1>
          <p className="text-gray-500 mt-2">Chronological tracking of every global inventory adjustment, inbound receipt, and allocation.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter by product, SKU, reference, module, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-white border-gray-200"
            />
          </div>
          {/* We assume any logged-in user can transfer for demo purposes, or we could add a `canEdit` check */}
          <Button onClick={() => setIsTransferModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">
            Transfer Stock
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center" role="status" aria-live="polite">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <span className="sr-only">Loading movements...</span>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
              <p className="text-rose-500">{error}</p>
              <Button onClick={loadData} variant="outline">Retry</Button>
            </div>
          ) : (
            <div className="relative overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Time & Date</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="w-[300px]">Asset Profile</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead className="text-center">Integrations</TableHead>
                    <TableHead className="text-right">Reference</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Layers className="h-10 w-10 text-gray-300" />
                          <p>No valid stock logs mapped to those filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMovements.map((m) => {
                    const dirNum = Number(m.direction);
                    const isDirectionMissing = m.direction == null || isNaN(dirNum);
                    const isOut = !isDirectionMissing && dirNum < 0;
                    const isUnknown = isDirectionMissing;
                    return (
                      <TableRow key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                          {(() => {
                            const d = new Date(m.date);
                            if (isNaN(d.getTime())) return <span className="text-gray-400">Invalid Date</span>;
                            return (
                              <>
                                {format(d, 'MMM d, yyyy')}<br />
                                <span className="text-xs text-gray-400">{format(d, 'h:mm:ss a')}</span>
                              </>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isOut ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                            {isOut ? <ArrowUpFromLine className="h-4 w-4 text-rose-500" /> : <ArrowDownToLine className="h-4 w-4 text-emerald-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-gray-900 block">{m.product?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {m.warehouse?.name || 'Lost Sector'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 uppercase tracking-widest text-[10px]">
                            {m.sourceModule}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-gray-500 font-mono text-xs">
                          {m.reference || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`font-bold text-lg ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isOut ? '' : '+'}{isNaN(Number(m.quantity)) || isNaN(Number(m.direction)) ? '-' : (Number(m.quantity) * Number(m.direction))}
                          </div>
                          <div className="text-xs text-gray-400 font-medium">
                            @ {isNaN(Number(m.unitCost)) ? '-' : formatCurrency(Number(m.unitCost))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
