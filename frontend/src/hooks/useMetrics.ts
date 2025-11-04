import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Metrics } from '@/types';

export function useMetrics(autoLoad = true) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getMetrics();
      if (response.success && response.data) {
        setMetrics(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch metrics');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      fetchMetrics();
    }
  }, [autoLoad]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}
