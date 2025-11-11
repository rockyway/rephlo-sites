import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Save,
  FileDown,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { MultiplierInput } from '@/components/admin/PricingComponents';
import { pricingApi, type SimulationScenario, type SimulationResult } from '@/api/pricing';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

/**
 * PricingSimulation Page
 *
 * What-if scenario analyzer for pricing changes.
 * Features:
 * - Configure simulation parameters
 * - Run impact prediction
 * - Visual impact preview
 * - Save scenarios
 * - Export reports
 */
function PricingSimulation() {
  const [scenario, setScenario] = useState<Partial<SimulationScenario>>({
    tier: '',
    providerId: '',
    modelId: '',
    currentMultiplier: 1.5,
    proposedMultiplier: 1.6,
    dateRangeStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateRangeEnd: new Date().toISOString().split('T')[0],
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dateRangeOptions = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Custom', days: 0 },
  ];

  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 days');

  const handleDateRangeChange = (option: string) => {
    setSelectedDateRange(option);
    const days = dateRangeOptions.find((o) => o.label === option)?.days || 30;
    if (days > 0) {
      const end = new Date();
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      setScenario({
        ...scenario,
        dateRangeStart: start.toISOString().split('T')[0],
        dateRangeEnd: end.toISOString().split('T')[0],
      });
    }
  };

  const handleRunSimulation = async () => {
    if (!scenario.proposedMultiplier || scenario.proposedMultiplier <= 0) {
      setError('Please set a valid proposed multiplier (greater than 0)');
      return;
    }

    setIsSimulating(true);
    setError(null);
    try {
      // Transform the scenario to match backend expectations
      const backendPayload: any = {
        newMultiplier: scenario.proposedMultiplier,
        simulationPeriodDays: 30,
      };

      // Only include modelId if it's a valid UUID (not empty string)
      if (scenario.modelId && scenario.modelId.trim() !== '') {
        backendPayload.modelId = scenario.modelId;
      }

      // Only include providerId if it's a valid UUID (not empty string)
      if (scenario.providerId && scenario.providerId.trim() !== '') {
        backendPayload.providerId = scenario.providerId;
      }

      // Only include tier if specified
      if (scenario.tier && scenario.tier.trim() !== '') {
        backendPayload.tier = scenario.tier;
      }

      const simulationResult = await pricingApi.simulateMultiplierChange(backendPayload as SimulationScenario);
      setResult(simulationResult);
      setSuccessMessage('Simulation completed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to run simulation';
      const errorDetails = err.response?.data?.error?.details;

      if (errorDetails) {
        const detailMessages = Object.entries(errorDetails)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        setError(`${errorMessage} - ${detailMessages}`);
      } else {
        setError(errorMessage);
      }
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!result) return;

    const name = window.prompt('Enter a name for this scenario:');
    if (!name) return;

    setIsSaving(true);
    try {
      await pricingApi.saveSimulationScenario(name, scenario as SimulationScenario, result);
      setSuccessMessage('Scenario saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save scenario');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportReport = () => {
    if (!result) return;

    // Generate CSV report
    const csv = `Pricing Simulation Report
Generated: ${new Date().toISOString()}

Scenario:
Tier: ${scenario.tier || 'All'}
Provider: ${scenario.providerId || 'All'}
Model: ${scenario.modelId || 'All'}
Current Multiplier: ${scenario.currentMultiplier}x
Proposed Multiplier: ${scenario.proposedMultiplier}x
Date Range: ${scenario.dateRangeStart} to ${scenario.dateRangeEnd}

Revenue Impact:
Additional Margin: $${result.revenueImpact.additionalMargin.toLocaleString()}
Current Margin: $${result.revenueImpact.currentMargin.toLocaleString()}
New Projected Margin: $${result.revenueImpact.newProjectedMargin.toLocaleString()}
Margin Change: ${result.revenueImpact.marginPercentChange.toFixed(1)}%

User Impact:
Affected Users: ${result.userImpact.affectedUsers}
Avg Credit Cost Increase: ${result.userImpact.avgCreditCostIncrease.toFixed(1)}%
Estimated Usage Reduction: ${result.userImpact.estimatedUsageReduction.min}% - ${result.userImpact.estimatedUsageReduction.max}%
Estimated Churn Impact: ${result.userImpact.estimatedChurnImpact.min} - ${result.userImpact.estimatedChurnImpact.max} users

Net Financial Impact:
Additional Revenue: $${result.netFinancialImpact.additionalRevenue.toLocaleString()}/month
Churn Cost: -$${result.netFinancialImpact.churnCost.toLocaleString()}/month
Net Benefit: $${result.netFinancialImpact.netBenefit.toLocaleString()}/month (${result.netFinancialImpact.netBenefitPercent.toFixed(1)}%)
`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-simulation-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const multiplierChange = scenario.proposedMultiplier && scenario.currentMultiplier
    ? ((scenario.proposedMultiplier - scenario.currentMultiplier) / scenario.currentMultiplier) * 100
    : 0;

  return (
    <div className="min-h-screen bg-deep-navy-50 dark:bg-deep-navy-900">
      {/* Breadcrumbs */}
      <Breadcrumbs />

{/* Header */}
      <header className="bg-white dark:bg-deep-navy-800 border-b border-deep-navy-200">
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
              <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">
                Pricing Simulation
              </h1>
              <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                What-if analysis for margin multiplier changes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simulation Setup */}
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
            <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white mb-6">
              Simulation Setup
            </h2>

            <div className="space-y-6">
              {/* Scope Selection */}
              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Apply To
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={scenario.tier || ''}
                    onChange={(e) => setScenario({ ...scenario, tier: e.target.value })}
                    className="flex h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20"
                  >
                    <option value="">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="pro_max">Pro Max</option>
                    <option value="enterprise_pro">Enterprise Pro</option>
                  </select>

                  <select
                    value={scenario.providerId || ''}
                    onChange={(e) => setScenario({ ...scenario, providerId: e.target.value })}
                    className="flex h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20"
                  >
                    <option value="">All Providers</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                  </select>

                  <select
                    value={scenario.modelId || ''}
                    onChange={(e) => setScenario({ ...scenario, modelId: e.target.value })}
                    className="flex h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20"
                  >
                    <option value="">All Models</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="gemini-2-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>
              </div>

              {/* Current Multiplier */}
              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Current Multiplier
                </label>
                <MultiplierInput
                  value={scenario.currentMultiplier || 1.5}
                  onChange={(value) => setScenario({ ...scenario, currentMultiplier: value })}
                  showMargin
                />
              </div>

              {/* Proposed Multiplier */}
              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Proposed Multiplier
                  {multiplierChange !== 0 && (
                    <span className={cn(
                      'ml-2 text-caption',
                      multiplierChange > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      ({multiplierChange > 0 ? '+' : ''}{multiplierChange.toFixed(1)}%)
                    </span>
                  )}
                </label>
                <MultiplierInput
                  value={scenario.proposedMultiplier || 1.6}
                  onChange={(value) => setScenario({ ...scenario, proposedMultiplier: value })}
                  showMargin
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Historical Data Range
                </label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20"
                >
                  {dateRangeOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selectedDateRange === 'Custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <input
                      type="date"
                      value={scenario.dateRangeStart}
                      onChange={(e) => setScenario({ ...scenario, dateRangeStart: e.target.value })}
                      className="flex h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 px-3 py-2 text-body-sm"
                    />
                    <input
                      type="date"
                      value={scenario.dateRangeEnd}
                      onChange={(e) => setScenario({ ...scenario, dateRangeEnd: e.target.value })}
                      className="flex h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 px-3 py-2 text-body-sm"
                    />
                  </div>
                )}
              </div>

              {/* Run Button */}
              <Button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full"
              >
                {isSimulating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Impact Preview */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Revenue Impact */}
                <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
                  <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                    Revenue Impact
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Additional Margin</p>
                      <p className="text-h3 font-bold text-green-600">
                        ${result.revenueImpact.additionalMargin.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Margin Change</p>
                      <p className="text-h3 font-bold text-rephlo-blue">
                        +{result.revenueImpact.marginPercentChange.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Current Margin</p>
                      <p className="text-body font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                        ${result.revenueImpact.currentMargin.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">New Projected</p>
                      <p className="text-body font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                        ${result.revenueImpact.newProjectedMargin.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Impact */}
                <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
                  <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-rephlo-blue" />
                    User Impact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">Affected Users</span>
                      <span className="text-body font-semibold text-deep-navy-800 dark:text-white">
                        {result.userImpact.affectedUsers.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">Avg Credit Cost Increase</span>
                      <span className="text-body font-semibold text-amber-600">
                        +{result.userImpact.avgCreditCostIncrease.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">Est. Usage Reduction</span>
                      <span className="text-body font-semibold text-amber-600">
                        -{result.userImpact.estimatedUsageReduction.min}% to -{result.userImpact.estimatedUsageReduction.max}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">Est. Churn Impact</span>
                      <span className="text-body font-semibold text-red-600">
                        {result.userImpact.estimatedChurnImpact.min}-{result.userImpact.estimatedChurnImpact.max} users
                      </span>
                    </div>
                  </div>
                </div>

                {/* Model Mix Impact */}
                {result.modelMixImpact.length > 0 && (
                  <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
                    <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                      Model Mix Impact
                    </h3>
                    <div className="space-y-2">
                      {result.modelMixImpact.map((model) => (
                        <div key={model.modelName} className="flex justify-between items-center">
                          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">{model.modelName}</span>
                          <div className="flex items-center gap-2">
                            {model.requestChangePercent > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={cn(
                              'text-body-sm font-medium',
                              model.requestChangePercent > 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {model.requestChangePercent > 0 ? '+' : ''}{model.requestChangePercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Net Impact */}
                <div className="bg-gradient-to-br from-rephlo-blue to-electric-cyan rounded-lg p-6 text-white">
                  <h3 className="text-h4 font-semibold mb-4">
                    Net Financial Impact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-body-sm opacity-90">Additional Revenue</span>
                      <span className="text-body font-semibold">
                        +${result.netFinancialImpact.additionalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-body-sm opacity-90">Churn Cost</span>
                      <span className="text-body font-semibold">
                        -${result.netFinancialImpact.churnCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="text-body font-medium">Net Benefit</span>
                        <div className="text-right">
                          <p className="text-h3 font-bold">
                            ${result.netFinancialImpact.netBenefit.toLocaleString()}/mo
                          </p>
                          <p className="text-caption opacity-90">
                            +{result.netFinancialImpact.netBenefitPercent.toFixed(1)}% revenue
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveScenario}
                    disabled={isSaving}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Scenario
                  </Button>
                  <Button
                    onClick={handleExportReport}
                    variant="secondary"
                    className="flex-1"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-deep-navy-300 mx-auto mb-4" />
                <p className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                  Configure simulation parameters and click "Run Simulation" to see impact preview
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PricingSimulation;
