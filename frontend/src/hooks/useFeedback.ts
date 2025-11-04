import { useState } from 'react';
import { api } from '@/services/api';

interface FeedbackFormData {
  message: string;
  email?: string;
  userId?: string;
}

export function useFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitFeedback = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await api.submitFeedback(data);
      setSuccess(true);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    submitFeedback,
    isSubmitting,
    error,
    success,
    reset,
  };
}
