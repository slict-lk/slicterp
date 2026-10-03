'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AIWorkflow, AIInsight } from '@/apps/ai/types';

export function useAI() {
  const [workflows, setWorkflows] = useState<AIWorkflow[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workflowsData, insightsData, forecastData] = await Promise.all([
        apiClient.get<AIWorkflow[]>('/ai/workflows'),
        apiClient.get<AIInsight[]>('/ai/insights'),
        apiClient.get('/ai/forecast?months=6'),
      ]);
      setWorkflows(workflowsData);
      setInsights(insightsData);
      setForecast(forecastData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async (data: Partial<AIWorkflow>) => {
    const workflow = await apiClient.post<AIWorkflow>('/ai/workflows', data);
    setWorkflows([...workflows, workflow]);
    return workflow;
  };

  const executeWorkflow = async (workflowId: string, input: any) => {
    return await apiClient.post(`/ai/workflows/${workflowId}/execute`, { input });
  };

  return {
    workflows,
    insights,
    forecast,
    loading,
    error,
    createWorkflow,
    executeWorkflow,
    reload: loadData,
  };
}
