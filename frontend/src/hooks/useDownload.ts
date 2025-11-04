import { useState } from 'react';
import { api } from '@/services/api';

export function useDownload() {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackDownload = async (os: 'windows' | 'macos' | 'linux' = 'windows') => {
    setIsTracking(true);
    setError(null);

    try {
      const response = await api.trackDownload(os);
      if (response.success && response.downloadUrl) {
        // Open download URL in new tab
        window.open(response.downloadUrl, '_blank');
        return true;
      } else {
        throw new Error(response.error || 'Failed to get download URL');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to track download');
      return false;
    } finally {
      setIsTracking(false);
    }
  };

  return {
    trackDownload,
    isTracking,
    error,
  };
}
