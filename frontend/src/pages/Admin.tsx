import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMetrics } from '@/hooks/useMetrics';
import MetricsCard from '@/components/admin/MetricsCard';
import FeedbackList from '@/components/admin/FeedbackList';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import { Download, MessageSquare, HardDrive, RefreshCw, ArrowLeft } from 'lucide-react';

function Admin() {
  const { metrics, isLoading, error, refetch } = useMetrics();
  const [feedbackEntries, setFeedbackEntries] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  useEffect(() => {
    // In a real implementation, we'd fetch feedback entries from the API
    // For now, we'll use mock data
    const loadFeedback = async () => {
      setIsLoadingFeedback(true);
      try {
        // This would be an actual API call
        // const response = await api.getFeedback();
        // setFeedbackEntries(response.data);

        // Mock data for demonstration
        setFeedbackEntries([
          {
            id: '1',
            message: 'Great tool! Really helps with my daily writing tasks.',
            email: 'user@example.com',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            message: 'Would love to see support for macOS soon.',
            userId: 'user123',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      } catch (err) {
        console.error('Failed to load feedback:', err);
      } finally {
        setIsLoadingFeedback(false);
      }
    };

    loadFeedback();
  }, []);

  const handleRefresh = () => {
    refetch();
  };

  const totalDownloads = metrics
    ? (metrics.downloads.total || (metrics.downloads.windows + metrics.downloads.macos + metrics.downloads.linux))
    : 0;

  const feedbackCount = metrics
    ? ((metrics as any).feedback?.total || (metrics as any).feedbackCount || 0)
    : 0;

  const diagnosticsCount = metrics
    ? ((metrics as any).diagnostics?.total || (metrics as any).diagnosticsCount || 0)
    : 0;

  return (
    <div className="min-h-screen bg-deep-navy-50">
      {/* Header */}
      <header className="bg-white border-b border-deep-navy-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="inline-flex items-center text-body text-rephlo-blue hover:text-rephlo-blue-600 mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
              <h1 className="text-h1 font-bold text-deep-navy-800">Rephlo Metrics Dashboard</h1>
              <p className="text-body text-deep-navy-500 mt-1">
                Real-time insights into downloads, feedback, and diagnostics
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={isLoading} variant="ghost">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && !metrics && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !metrics && (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
            <p className="text-body text-red-800">
              Failed to load metrics: {error}
            </p>
            <Button onClick={handleRefresh} className="mt-4" variant="secondary">
              Try Again
            </Button>
          </div>
        )}

        {/* Metrics Cards */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Total Downloads */}
              <MetricsCard
                title="Total Downloads"
                value={totalDownloads.toLocaleString()}
                subtitle="All platforms"
                icon={Download}
                color="blue"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-deep-navy-500">Windows</span>
                    <span className="font-semibold text-deep-navy-800">
                      {metrics.downloads.windows.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-deep-navy-500">macOS</span>
                    <span className="font-semibold text-deep-navy-800">
                      {metrics.downloads.macos.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-deep-navy-500">Linux</span>
                    <span className="font-semibold text-deep-navy-800">
                      {metrics.downloads.linux.toLocaleString()}
                    </span>
                  </div>
                </div>
              </MetricsCard>

              {/* Feedback Count */}
              <MetricsCard
                title="User Feedback"
                value={feedbackCount.toLocaleString()}
                subtitle="Total submissions"
                icon={MessageSquare}
                color="cyan"
              />

              {/* Diagnostics */}
              <MetricsCard
                title="Diagnostic Reports"
                value={diagnosticsCount.toLocaleString()}
                subtitle="User submissions"
                icon={HardDrive}
                color="green"
              />
            </div>

            {/* Feedback List */}
            {isLoadingFeedback ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <FeedbackList entries={feedbackEntries} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Admin;
