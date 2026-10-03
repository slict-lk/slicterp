'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Subscription, SubscriptionPlan, SubscriptionMetrics } from '@/apps/subscriptions/types';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsData, plansData, metricsData] = await Promise.all([
        apiClient.get<Subscription[]>('/subscriptions'),
        apiClient.get<SubscriptionPlan[]>('/subscriptions/plans'),
        apiClient.get<SubscriptionMetrics>('/subscriptions/metrics'),
      ]);
      setSubscriptions(subsData);
      setPlans(plansData);
      setMetrics(metricsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (data: Partial<Subscription>) => {
    const sub = await apiClient.post<Subscription>('/subscriptions', data);
    setSubscriptions([...subscriptions, sub]);
    return sub;
  };

  const createPlan = async (data: Partial<SubscriptionPlan>) => {
    const plan = await apiClient.post<SubscriptionPlan>('/subscriptions/plans', data);
    setPlans([...plans, plan]);
    return plan;
  };

  return {
    subscriptions,
    plans,
    metrics,
    loading,
    error,
    createSubscription,
    createPlan,
    reload: loadData,
  };
}
