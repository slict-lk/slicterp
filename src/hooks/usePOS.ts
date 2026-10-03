'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { POSSession, POSOrder } from '@/apps/pos/types';

export function usePOS() {
  const [sessions, setSessions] = useState<POSSession[]>([]);
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [currentSession, setCurrentSession] = useState<POSSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<POSSession[]>('/pos/sessions');
      setSessions(data);
      const open = data.find(s => s.status === 'OPEN');
      setCurrentSession(open || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSession = async (data: any) => {
    const session = await apiClient.post<POSSession>('/pos/sessions', data);
    setSessions([...sessions, session]);
    setCurrentSession(session);
    return session;
  };

  const createOrder = async (data: Partial<POSOrder>) => {
    const order = await apiClient.post<POSOrder>('/pos/orders', data);
    setOrders([...orders, order]);
    return order;
  };

  return {
    sessions,
    orders,
    currentSession,
    loading,
    error,
    openSession,
    createOrder,
    reload: loadSessions,
  };
}
