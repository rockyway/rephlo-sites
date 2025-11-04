import { useState, FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/common/Card';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import Button from '@/components/common/Button';
import { useFeedback } from '@/hooks/useFeedback';
import { CheckCircle, XCircle } from 'lucide-react';

function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const { submitFeedback, isSubmitting, error, success, reset } = useFeedback();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    const result = await submitFeedback({
      message: message.trim(),
      email: email.trim() || undefined,
      userId: userId.trim() || undefined,
    });

    if (result) {
      // Clear form on success
      setMessage('');
      setEmail('');
      setUserId('');
    }
  };

  return (
    <section className="py-20 bg-deep-navy-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-h2">Share Your Feedback</CardTitle>
              <CardDescription>
                Help us improve Rephlo. Your feedback shapes the future of the product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Success Message */}
                {success && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-md border border-green-200">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-body-sm">
                      Thank you for your feedback! We'll review it carefully.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
                    <XCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-body-sm">{error}</p>
                  </div>
                )}

                {/* Message Field */}
                <div className="space-y-2">
                  <label htmlFor="message" className="text-body-sm font-medium text-deep-navy-700">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your thoughts, suggestions, or issues..."
                    required
                    maxLength={1000}
                    rows={5}
                    disabled={isSubmitting}
                  />
                  <p className="text-caption text-deep-navy-400">
                    {message.length}/1000 characters
                  </p>
                </div>

                {/* Email Field (Optional) */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-body-sm font-medium text-deep-navy-700">
                    Email (optional)
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={isSubmitting}
                  />
                  <p className="text-caption text-deep-navy-400">
                    We'll only use this to follow up on your feedback
                  </p>
                </div>

                {/* User ID Field (Optional) */}
                <div className="space-y-2">
                  <label htmlFor="userId" className="text-body-sm font-medium text-deep-navy-700">
                    User ID (optional)
                  </label>
                  <Input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Optional user identifier"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                  {(success || error) && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={reset}
                      disabled={isSubmitting}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default FeedbackForm;
