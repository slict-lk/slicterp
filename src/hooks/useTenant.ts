'use client';

import { useState, useEffect } from 'react';

export function useTenant() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch('/api/tenant/current');
        if (!response.ok) {
          // If no tenant API exists, use a default tenant
          setTenantId('default-tenant');
          return;
        }
        const data = await response.json();
        setTenantId(data.id || 'default-tenant');
      } catch (err) {
        console.error('Failed to fetch tenant:', err);
        // Fallback to default tenant
        setTenantId('default-tenant');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return { tenantId, loading, error };
}

