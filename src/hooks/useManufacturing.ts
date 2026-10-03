'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { BillOfMaterials, ManufacturingOrder } from '@/apps/manufacturing/types';

export function useManufacturing() {
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bomsData, ordersData] = await Promise.all([
        apiClient.get<BillOfMaterials[]>('/manufacturing/bom'),
        apiClient.get<ManufacturingOrder[]>('/manufacturing/orders'),
      ]);
      setBoms(bomsData);
      setOrders(ordersData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBOM = async (data: Partial<BillOfMaterials>) => {
    const newBOM = await apiClient.post<BillOfMaterials>('/manufacturing/bom', data);
    setBoms([...boms, newBOM]);
    return newBOM;
  };

  const createOrder = async (data: Partial<ManufacturingOrder>) => {
    const newOrder = await apiClient.post<ManufacturingOrder>('/manufacturing/orders', data);
    setOrders([...orders, newOrder]);
    return newOrder;
  };

  return {
    boms,
    orders,
    loading,
    error,
    createBOM,
    createOrder,
    reload: loadData,
  };
}
