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
import {
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
  PaymentStatus,
  type BillingInvoice,
  type PaymentTransaction,
} from '@rephlo/shared-types';
import {
  type DunningAttempt,
  type RevenueMetrics,
  type RevenueByTier,
} from '@/types/plan109.types';
import { formatCurrency, formatDate, formatPercentage, getTierDisplayName, getTierColor } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import { safeArray } from '@/lib/safeUtils';

function BillingDashboard() {
  // State
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [revenueByTier, setRevenueByTier] = useState<RevenueByTier[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
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

      // Handle multiple response formats consistently
      setRevenueMetrics((metrics as any).data || metrics);
      setRevenueByTier(safeArray<RevenueByTier>((tierRevenue as any).tiers || (tierRevenue as any).data?.tiers || (tierRevenue as any).data));
      setInvoices(safeArray<BillingInvoice>((invoiceData as any).data || invoiceData));
      setTransactions(safeArray<PaymentTransaction>((transactionData as any).data || transactionData));
      setDunningAttempts(safeArray<DunningAttempt>((dunningData as any).attempts || (dunningData as any).data?.attempts || (dunningData as any).data));
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
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">Billing Dashboard</h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Revenue tracking, invoice management, and payment monitoring
          </p>
        </div>
        <Button onClick={loadData} disabled={isLoading} variant="ghost">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      <div>
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
            <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200 font-medium">Total MRR</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800 dark:text-white">{formatCurrency(revenueMetrics.totalMRR, 0)}</p>
              <div className={cn(
                'flex items-center gap-1 mt-2 text-caption',
                revenueMetrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {revenueMetrics.mrrGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {formatPercentage(Math.abs(revenueMetrics.mrrGrowth))} MoM
              </div>
            </div>

            <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200 font-medium">Total ARR</h3>
                <TrendingUp className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800 dark:text-white">{formatCurrency(revenueMetrics.totalARR, 0)}</p>
              <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200 mt-2">Annual Recurring Revenue</p>
            </div>

            <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200 font-medium">Avg Revenue Per User</h3>
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800 dark:text-white">{formatCurrency(revenueMetrics.avgRevenuePerUser)}</p>
              <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200 mt-2">ARPU</p>
            </div>

            <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200 font-medium">Total Revenue This Month</h3>
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800 dark:text-white">{formatCurrency(revenueMetrics.totalRevenueThisMonth, 0)}</p>
            </div>
          </div>
        )}

        {/* Revenue by Tier */}
        {revenueByTier && revenueByTier.length > 0 && (
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6 mb-8">
            <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white mb-4">Revenue by Tier</h2>
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
                      <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                        {formatCurrency(tier.revenue, 0)}
                      </span>
                      <span className="text-caption text-deep-navy-700 dark:text-deep-navy-200">
                        ({tier.subscriberCount} subscribers)
                      </span>
                    </div>
                    <span className="text-body-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
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
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
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
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
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
                    <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Invoice ID</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">User Email</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Amount</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Status</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Due Date</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Paid Date</th>
                        <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-body text-deep-navy-700 dark:text-deep-navy-200">
                            No invoices found
                          </td>
                        </tr>
                      ) : (
                        invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-body-sm font-mono text-deep-navy-700 dark:text-deep-navy-200">
                                {invoice.stripeInvoiceId.slice(-8)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body text-deep-navy-800 dark:text-white">{invoice.userId || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                                {formatCurrency(invoice.amountDue)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                                invoice.status === InvoiceStatus.PAID && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
                                invoice.status === InvoiceStatus.OPEN && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                                invoice.status === InvoiceStatus.VOID && 'bg-deep-navy-100 dark:bg-deep-navy-800 text-deep-navy-700 dark:text-deep-navy-200 border-deep-navy-300 dark:border-deep-navy-600',
                                invoice.status === InvoiceStatus.UNCOLLECTIBLE && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                              )}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                                {invoice.periodEnd ? formatDate(invoice.periodEnd) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                                {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {invoice.invoicePdf && (
                                  <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
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
                    <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Transaction ID</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">User Email</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Amount</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Payment Method</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Status</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Date</th>
                        <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-body text-deep-navy-700 dark:text-deep-navy-200">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-body-sm font-mono text-deep-navy-700 dark:text-deep-navy-200">
                                {transaction.stripePaymentIntentId.slice(-8)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body text-deep-navy-800 dark:text-white">{transaction.userId || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                                {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                                {transaction.paymentMethodType || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                                transaction.status === PaymentStatus.SUCCEEDED && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
                                transaction.status === PaymentStatus.PENDING && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                                transaction.status === PaymentStatus.FAILED && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
                                transaction.status === PaymentStatus.REFUNDED && 'bg-deep-navy-100 dark:bg-deep-navy-800 text-deep-navy-700 dark:text-deep-navy-200 border-deep-navy-300 dark:border-deep-navy-600'
                              )}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                                {formatDate(transaction.createdAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {transaction.status === PaymentStatus.SUCCEEDED && (
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
                    <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">User Email</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Invoice ID</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Amount</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Failed Date</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Retry Attempt</th>
                        <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Next Retry</th>
                        <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                      {dunningAttempts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-body text-deep-navy-700 dark:text-deep-navy-200">
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
                              <span className="text-body text-deep-navy-800 dark:text-white">
                                {attempt.subscription?.user?.email || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm font-mono text-deep-navy-700 dark:text-deep-navy-200">
                                {attempt.invoice?.stripeInvoiceId.slice(-8)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                                {attempt.invoice ? formatCurrency(attempt.invoice.amountDue) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                                {formatDate(attempt.createdAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                                attempt.attemptNumber >= 3 && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
                                attempt.attemptNumber === 2 && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                                attempt.attemptNumber === 1 && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                              )}>
                                Attempt {attempt.attemptNumber}/3
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
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
      </div>
    </div>
  );
}

export default BillingDashboard;
