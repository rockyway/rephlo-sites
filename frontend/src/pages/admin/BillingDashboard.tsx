/**
 * Billing Dashboard Page
 *
 * Financial overview with revenue tracking, invoice management, and dunning monitoring.
 *
 * Features:
 * - Revenue Overview Cards (MRR, ARR, ARPU, Monthly Revenue)
 * - Revenue by Tier Chart
 * - Recent Invoices Table
 * - Failed Payments & Dunning Management
 * - Payment Transactions List
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  CreditCard,
  Download,
  CheckCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { billingApi } from '@/api/plan109';
import {
  InvoiceStatus,
  TransactionStatus,
  type Invoice,
  type Transaction,
  type DunningAttempt,
  type RevenueMetrics,
  type RevenueByTier,
} from '@/types/plan109.types';
import { formatCurrency, formatDate, formatPercentage, getTierDisplayName, getTierColor } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';

function BillingDashboard() {
  // State
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [revenueByTier, setRevenueByTier] = useState<RevenueByTier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dunningAttempts, setDunningAttempts] = useState<DunningAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions' | 'dunning'>('invoices');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [metrics, tierRevenue, invoiceData, transactionData, dunningData] = await Promise.all([
        billingApi.getRevenueMetrics(),
        billingApi.getRevenueByTier(),
        billingApi.listInvoices(undefined, { limit: 20 }),
        billingApi.listTransactions(undefined, { limit: 20 }),
        billingApi.getDunningAttempts(),
      ]);

      setRevenueMetrics(metrics);
      setRevenueByTier(tierRevenue.tiers);
      setInvoices(invoiceData.data);
      setTransactions(transactionData.data);
      setDunningAttempts(dunningData.attempts);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleRetryPayment = async (attemptId: string) => {
    try {
      await billingApi.retryPayment(attemptId);
      setSuccessMessage('Payment retry initiated');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to retry payment');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRefund = async (transactionId: string) => {
    const reason = window.prompt('Enter refund reason:');
    if (!reason) return;

    try {
      await billingApi.refundTransaction(transactionId, {
        transactionId,
        reason,
      });
      setSuccessMessage('Refund processed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process refund');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Calculate dunning stats
  const criticalDunning = dunningAttempts.filter(d => d.attemptNumber >= 3);
  const activeDunning = dunningAttempts.filter(d => d.status === 'scheduled' || d.status === 'failed');

  return (
    <div className="min-h-screen bg-deep-navy-50">
      {/* Header */}
      <header className="bg-white border-b border-deep-navy-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin"
                className="inline-flex items-center text-body text-rephlo-blue hover:text-rephlo-blue-600 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Admin
              </Link>
              <h1 className="text-h1 font-bold text-deep-navy-800">Billing Dashboard</h1>
              <p className="text-body text-deep-navy-500 mt-1">
                Revenue tracking, invoice management, and payment monitoring
              </p>
            </div>
            <Button onClick={loadData} disabled={isLoading} variant="ghost">
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {/* Revenue Overview Cards */}
        {revenueMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total MRR</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(revenueMetrics.totalMRR, 0)}</p>
              <div className={cn(
                'flex items-center gap-1 mt-2 text-caption',
                revenueMetrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {revenueMetrics.mrrGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {formatPercentage(Math.abs(revenueMetrics.mrrGrowth))} MoM
              </div>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total ARR</h3>
                <TrendingUp className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(revenueMetrics.totalARR, 0)}</p>
              <p className="text-caption text-deep-navy-500 mt-2">Annual Recurring Revenue</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Avg Revenue Per User</h3>
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(revenueMetrics.avgRevenuePerUser)}</p>
              <p className="text-caption text-deep-navy-500 mt-2">ARPU</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total Revenue This Month</h3>
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(revenueMetrics.totalRevenueThisMonth, 0)}</p>
            </div>
          </div>
        )}

        {/* Revenue by Tier */}
        {revenueByTier.length > 0 && (
          <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mb-8">
            <h2 className="text-h3 font-semibold text-deep-navy-800 mb-4">Revenue by Tier</h2>
            <div className="space-y-4">
              {revenueByTier.map((tier) => (
                <div key={tier.tier}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                        getTierColor(tier.tier)
                      )}>
                        {getTierDisplayName(tier.tier)}
                      </span>
                      <span className="text-body text-deep-navy-700">
                        {formatCurrency(tier.revenue, 0)}
                      </span>
                      <span className="text-caption text-deep-navy-500">
                        ({tier.subscriberCount} subscribers)
                      </span>
                    </div>
                    <span className="text-body-sm font-medium text-deep-navy-600">
                      {formatPercentage(tier.percentage)}
                    </span>
                  </div>
                  <div className="w-full bg-deep-navy-100 rounded-full h-2">
                    <div
                      className="bg-rephlo-blue h-2 rounded-full transition-all"
                      style={{ width: `${tier.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Payments Alert */}
        {activeDunning.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-h4 font-semibold text-amber-900">
                  Active Dunning Alerts
                </h3>
                <p className="text-body text-amber-800 mt-1">
                  {activeDunning.length} invoices in dunning process - {criticalDunning.length} at 3rd retry (risk of suspension)
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setActiveTab('dunning')}
                >
                  View Dunning Queue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b border-deep-navy-200 flex">
            <button
              onClick={() => setActiveTab('invoices')}
              className={cn(
                'px-6 py-4 text-body-sm font-medium transition-colors border-b-2',
                activeTab === 'invoices'
                  ? 'border-rephlo-blue text-rephlo-blue'
                  : 'border-transparent text-deep-navy-600 hover:text-deep-navy-800'
              )}
            >
              <FileText className="h-4 w-4 inline-block mr-2" />
              Recent Invoices
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'px-6 py-4 text-body-sm font-medium transition-colors border-b-2',
                activeTab === 'transactions'
                  ? 'border-rephlo-blue text-rephlo-blue'
                  : 'border-transparent text-deep-navy-600 hover:text-deep-navy-800'
              )}
            >
              <CreditCard className="h-4 w-4 inline-block mr-2" />
              Payment Transactions
            </button>
            <button
              onClick={() => setActiveTab('dunning')}
              className={cn(
                'px-6 py-4 text-body-sm font-medium transition-colors border-b-2',
                activeTab === 'dunning'
                  ? 'border-rephlo-blue text-rephlo-blue'
                  : 'border-transparent text-deep-navy-600 hover:text-deep-navy-800'
              )}
            >
              <AlertCircle className="h-4 w-4 inline-block mr-2" />
              Failed Payments & Dunning
              {activeDunning.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium bg-red-100 text-red-700">
                  {activeDunning.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                  <table className="w-full">
                    <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Invoice ID</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">User Email</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Amount</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Status</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Due Date</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Paid Date</th>
                        <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-100">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-body text-deep-navy-500">
                            No invoices found
                          </td>
                        </tr>
                      ) : (
                        invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-deep-navy-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-body-sm font-mono text-deep-navy-700">
                                {invoice.stripeInvoiceId.slice(-8)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body text-deep-navy-800">{invoice.user?.email || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body font-medium text-deep-navy-800">
                                {formatCurrency(invoice.amountDue)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                                invoice.status === InvoiceStatus.PAID && 'bg-green-100 text-green-700 border-green-300',
                                invoice.status === InvoiceStatus.OPEN && 'bg-blue-100 text-blue-700 border-blue-300',
                                invoice.status === InvoiceStatus.VOID && 'bg-gray-100 text-gray-700 border-gray-300',
                                invoice.status === InvoiceStatus.UNCOLLECTIBLE && 'bg-red-100 text-red-700 border-red-300'
                              )}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600">
                                {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600">
                                {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {invoice.invoicePdfUrl && (
                                  <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="ghost">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                  <table className="w-full">
                    <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Transaction ID</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">User Email</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Amount</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Payment Method</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Status</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Date</th>
                        <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-100">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-body text-deep-navy-500">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-deep-navy-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-body-sm font-mono text-deep-navy-700">
                                {transaction.stripePaymentIntentId.slice(-8)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body text-deep-navy-800">{transaction.user?.email || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body font-medium text-deep-navy-800">
                                {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600">
                                {transaction.paymentMethodType || 'N/A'} {transaction.last4 && `****${transaction.last4}`}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                                transaction.status === TransactionStatus.SUCCEEDED && 'bg-green-100 text-green-700 border-green-300',
                                transaction.status === TransactionStatus.PENDING && 'bg-blue-100 text-blue-700 border-blue-300',
                                transaction.status === TransactionStatus.FAILED && 'bg-red-100 text-red-700 border-red-300',
                                transaction.status === TransactionStatus.REFUNDED && 'bg-gray-100 text-gray-700 border-gray-300'
                              )}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600">
                                {formatDate(transaction.createdAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {transaction.status === TransactionStatus.SUCCEEDED && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRefund(transaction.id)}
                                  >
                                    Refund
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* Dunning Tab */}
                {activeTab === 'dunning' && (
                  <table className="w-full">
                    <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">User Email</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Invoice ID</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Amount</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Failed Date</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Retry Attempt</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">Next Retry</th>
                        <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-100">
                      {dunningAttempts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-body text-deep-navy-500">
                            No failed payments
                          </td>
                        </tr>
                      ) : (
                        dunningAttempts.map((attempt) => (
                          <tr key={attempt.id} className={cn(
                            'hover:bg-deep-navy-50 transition-colors',
                            attempt.attemptNumber >= 3 && 'bg-red-50'
                          )}>
                            <td className="px-6 py-4">
                              <span className="text-body text-deep-navy-800">
                                {attempt.subscription?.user?.email || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm font-mono text-deep-navy-700">
                                {attempt.invoice?.stripeInvoiceId.slice(-8)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body font-medium text-deep-navy-800">
                                {attempt.invoice ? formatCurrency(attempt.invoice.amountDue) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600">
                                {formatDate(attempt.createdAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                                attempt.attemptNumber >= 3 && 'bg-red-100 text-red-700 border-red-300',
                                attempt.attemptNumber === 2 && 'bg-amber-100 text-amber-700 border-amber-300',
                                attempt.attemptNumber === 1 && 'bg-blue-100 text-blue-700 border-blue-300'
                              )}>
                                Attempt {attempt.attemptNumber}/3
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600">
                                {attempt.retryAt ? formatDate(attempt.retryAt) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {attempt.status !== 'succeeded' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleRetryPayment(attempt.id)}
                                  >
                                    Retry Now
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default BillingDashboard;
