/**
 * Admin Settings Page
 *
 * Comprehensive settings management page with 6 categories:
 * 1. General Settings
 * 2. Email & Notifications
 * 3. Security Settings
 * 4. Integration Settings
 * 5. Feature Flags
 * 6. System Settings
 *
 * Features:
 * - Tab-based interface for organized settings
 * - Form validation using React Hook Form
 * - Save/Cancel buttons per tab
 * - Confirmation dialogs for destructive actions
 * - Loading states during save
 * - Success/error toast notifications
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save, X as XIcon, RefreshCw, AlertCircle, CheckCircle, Mail, Trash2, Database } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { settingsApi, type CategorySettings, type SettingCategory } from '@/api/settings.api';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

type TabId = 'general' | 'email' | 'security' | 'integrations' | 'feature_flags' | 'system';

interface Tab {
  id: TabId;
  label: string;
  category: SettingCategory;
}

const TABS: Tab[] = [
  { id: 'general', label: 'General', category: 'general' },
  { id: 'email', label: 'Email & Notifications', category: 'email' },
  { id: 'security', label: 'Security', category: 'security' },
  { id: 'integrations', label: 'Integrations', category: 'integrations' },
  { id: 'feature_flags', label: 'Feature Flags', category: 'feature_flags' },
  { id: 'system', label: 'System', category: 'system' },
];

function AdminSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [allSettings, setAllSettings] = useState<Record<SettingCategory, CategorySettings>>({} as any);
  const [formData, setFormData] = useState<CategorySettings>({});
  const [originalData, setOriginalData] = useState<CategorySettings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync activeTab with URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '') as TabId;
    const validTab = TABS.find(t => t.id === hash);
    if (validTab) {
      setActiveTab(hash);
    } else if (!location.hash) {
      // Default to 'general' if no hash
      setActiveTab('general');
    }
  }, [location.hash]);

  // Load all settings on mount
  useEffect(() => {
    loadAllSettings();
  }, []);

  // Update form data when tab changes
  useEffect(() => {
    const currentTab = TABS.find(t => t.id === activeTab);
    if (currentTab && allSettings[currentTab.category]) {
      setFormData(allSettings[currentTab.category]);
      setOriginalData(allSettings[currentTab.category]);
      setHasChanges(false);
    }
  }, [activeTab, allSettings]);

  // Track form changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  const loadAllSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = await settingsApi.getAllSettings();
      setAllSettings(settings);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const currentTab = TABS.find(t => t.id === activeTab);
    if (!currentTab) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedSettings = await settingsApi.updateCategorySettings(currentTab.category, formData);

      // Update allSettings
      setAllSettings(prev => ({
        ...prev,
        [currentTab.category]: updatedSettings,
      }));

      setOriginalData(updatedSettings);
      setFormData(updatedSettings);
      setHasChanges(false);
      setSuccessMessage(`${currentTab.label} settings saved successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save settings');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setHasChanges(false);
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await settingsApi.testEmailConfig(formData);
      if (result.success) {
        setSuccessMessage(result.message || 'Email test successful');
      } else {
        setError(result.message || 'Email test failed');
      }
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to test email');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the application cache?')) {
      return;
    }

    setIsClearingCache(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await settingsApi.clearCache();
      if (result.success) {
        setSuccessMessage(result.message || 'Cache cleared successfully');
      } else {
        setError(result.message || 'Failed to clear cache');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to clear cache');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleRunBackup = async () => {
    if (!confirm('Create a database backup now?')) {
      return;
    }

    setIsRunningBackup(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await settingsApi.runBackup();
      if (result.success) {
        setSuccessMessage(result.message || 'Backup created successfully');
        // Reload settings to update last_backup timestamp
        loadAllSettings();
      } else {
        setError(result.message || 'Failed to create backup');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create backup');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRunningBackup(false);
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings formData={formData} onChange={handleInputChange} />;
      case 'email':
        return <EmailSettings formData={formData} onChange={handleInputChange} onTestEmail={handleTestEmail} isTestingEmail={isTestingEmail} />;
      case 'security':
        return <SecuritySettings formData={formData} onChange={handleInputChange} />;
      case 'integrations':
        return <IntegrationSettings formData={formData} onChange={handleInputChange} />;
      case 'feature_flags':
        return <FeatureFlagSettings formData={formData} onChange={handleInputChange} />;
      case 'system':
        return <SystemSettings formData={formData} onChange={handleInputChange} onClearCache={handleClearCache} onRunBackup={handleRunBackup} isClearingCache={isClearingCache} isRunningBackup={isRunningBackup} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

{/* Header */}
      <div>
        <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">Settings</h1>
        <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
          Configure platform settings and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-body text-green-800">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-body text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-deep-navy-200 overflow-x-auto">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  navigate(`/admin/settings#${tab.id}`, { replace: true });
                }}
                className={cn(
                  'px-6 py-4 text-body-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-rephlo-blue dark:bg-electric-cyan text-white dark:text-deep-navy-900 border-b-2 border-rephlo-blue dark:border-electric-cyan'
                    : 'text-deep-navy-600 dark:text-deep-navy-300 hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 hover:text-deep-navy-800 dark:hover:text-deep-navy-100'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>

        {/* Save/Cancel Buttons */}
        <div className="px-6 py-4 bg-deep-navy-50 dark:bg-deep-navy-900 border-t border-deep-navy-200 flex items-center justify-between">
          <div>
            {hasChanges && (
              <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                You have unsaved changes
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={!hasChanges || isSaving}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

interface SettingsProps {
  formData: CategorySettings;
  onChange: (key: string, value: any) => void;
}

/**
 * General Settings Tab
 */
function GeneralSettings({ formData, onChange }: SettingsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Platform Name
          </label>
          <Input
            type="text"
            value={formData.platform_name || ''}
            onChange={(e) => onChange('platform_name', e.target.value)}
            placeholder="Rephlo"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Timezone
          </label>
          <select
            value={formData.timezone || 'America/New_York'}
            onChange={(e) => onChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
          >
            <option value="America/New_York">America/New_York (EST/EDT)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
            <option value="America/Chicago">America/Chicago (CST/CDT)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Date Format
          </label>
          <select
            value={formData.date_format || 'MM/DD/YYYY'}
            onChange={(e) => onChange('date_format', e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Time Format
          </label>
          <select
            value={formData.time_format || '12h'}
            onChange={(e) => onChange('time_format', e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
          >
            <option value="12h">12-hour (1:30 PM)</option>
            <option value="24h">24-hour (13:30)</option>
          </select>
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Default Currency
          </label>
          <select
            value={formData.default_currency || 'USD'}
            onChange={(e) => onChange('default_currency', e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Default Language
          </label>
          <select
            value={formData.default_language || 'en'}
            onChange={(e) => onChange('default_language', e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
          Platform Description
        </label>
        <textarea
          value={formData.platform_description || ''}
          onChange={(e) => onChange('platform_description', e.target.value)}
          placeholder="Transform text. Keep your flow."
          rows={3}
          className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
        />
      </div>
    </div>
  );
}

/**
 * Email Settings Tab
 */
function EmailSettings({ formData, onChange, onTestEmail, isTestingEmail }: SettingsProps & { onTestEmail: () => void; isTestingEmail: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            SMTP Host
          </label>
          <Input
            type="text"
            value={formData.smtp_host || ''}
            onChange={(e) => onChange('smtp_host', e.target.value)}
            placeholder="smtp.sendgrid.net"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            SMTP Port
          </label>
          <Input
            type="number"
            value={formData.smtp_port || 587}
            onChange={(e) => onChange('smtp_port', parseInt(e.target.value) || 587)}
            placeholder="587"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            SMTP Username
          </label>
          <Input
            type="text"
            value={formData.smtp_username || ''}
            onChange={(e) => onChange('smtp_username', e.target.value)}
            placeholder="apikey"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            SMTP Password
          </label>
          <Input
            type="password"
            value={formData.smtp_password || ''}
            onChange={(e) => onChange('smtp_password', e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            From Email
          </label>
          <Input
            type="email"
            value={formData.from_email || ''}
            onChange={(e) => onChange('from_email', e.target.value)}
            placeholder="noreply@rephlo.com"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            From Name
          </label>
          <Input
            type="text"
            value={formData.from_name || ''}
            onChange={(e) => onChange('from_name', e.target.value)}
            placeholder="Rephlo"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="smtp_secure"
          checked={formData.smtp_secure || false}
          onChange={(e) => onChange('smtp_secure', e.target.checked)}
          className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
        />
        <label htmlFor="smtp_secure" className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
          Use TLS/SSL (Secure Connection)
        </label>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <Button
          variant="secondary"
          onClick={onTestEmail}
          disabled={isTestingEmail}
        >
          {isTestingEmail ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Test Email Configuration
            </>
          )}
        </Button>
        <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-2">
          Send a test email to verify SMTP configuration
        </p>
      </div>
    </div>
  );
}

/**
 * Security Settings Tab
 */
function SecuritySettings({ formData, onChange }: SettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Session Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Session Timeout (minutes)
            </label>
            <Input
              type="number"
              value={formData.session_timeout_minutes || 1440}
              onChange={(e) => onChange('session_timeout_minutes', parseInt(e.target.value) || 1440)}
              placeholder="1440"
            />
            <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
              Default: 1440 minutes (24 hours)
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Password Policy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Minimum Length
            </label>
            <Input
              type="number"
              value={formData.password_min_length || 8}
              onChange={(e) => onChange('password_min_length', parseInt(e.target.value) || 8)}
              placeholder="8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="password_require_uppercase"
              checked={formData.password_require_uppercase !== false}
              onChange={(e) => onChange('password_require_uppercase', e.target.checked)}
              className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
            />
            <label htmlFor="password_require_uppercase" className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
              Require uppercase letters
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="password_require_lowercase"
              checked={formData.password_require_lowercase !== false}
              onChange={(e) => onChange('password_require_lowercase', e.target.checked)}
              className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
            />
            <label htmlFor="password_require_lowercase" className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
              Require lowercase letters
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="password_require_numbers"
              checked={formData.password_require_numbers !== false}
              onChange={(e) => onChange('password_require_numbers', e.target.checked)}
              className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
            />
            <label htmlFor="password_require_numbers" className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
              Require numbers
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="password_require_symbols"
              checked={formData.password_require_symbols !== false}
              onChange={(e) => onChange('password_require_symbols', e.target.checked)}
              className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
            />
            <label htmlFor="password_require_symbols" className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
              Require special characters
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Multi-Factor Authentication</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              MFA Enforcement
            </label>
            <select
              value={formData.mfa_enforcement || 'optional'}
              onChange={(e) => onChange('mfa_enforcement', e.target.value)}
              className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
            >
              <option value="optional">Optional</option>
              <option value="required">Required</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Account Lockout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Failed Login Attempts Before Lockout
            </label>
            <Input
              type="number"
              value={formData.failed_login_attempts_lockout || 5}
              onChange={(e) => onChange('failed_login_attempts_lockout', parseInt(e.target.value) || 5)}
              placeholder="5"
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Lockout Duration (minutes)
            </label>
            <Input
              type="number"
              value={formData.lockout_duration_minutes || 15}
              onChange={(e) => onChange('lockout_duration_minutes', parseInt(e.target.value) || 15)}
              placeholder="15"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Integration Settings Tab
 */
function IntegrationSettings({ formData, onChange }: SettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Stripe Integration</h3>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Stripe API Key
            </label>
            <Input
              type="password"
              value={formData.stripe_api_key || ''}
              onChange={(e) => onChange('stripe_api_key', e.target.value)}
              placeholder="sk_test_..."
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Stripe Webhook Secret
            </label>
            <Input
              type="password"
              value={formData.stripe_webhook_secret || ''}
              onChange={(e) => onChange('stripe_webhook_secret', e.target.value)}
              placeholder="whsec_..."
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">SendGrid Integration</h3>
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            SendGrid API Key
          </label>
          <Input
            type="password"
            value={formData.sendgrid_api_key || ''}
            onChange={(e) => onChange('sendgrid_api_key', e.target.value)}
            placeholder="SG...."
          />
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">LLM Provider API Keys</h3>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              OpenAI API Key
            </label>
            <Input
              type="password"
              value={formData.openai_api_key || ''}
              onChange={(e) => onChange('openai_api_key', e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Anthropic API Key
            </label>
            <Input
              type="password"
              value={formData.anthropic_api_key || ''}
              onChange={(e) => onChange('anthropic_api_key', e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Google AI API Key
            </label>
            <Input
              type="password"
              value={formData.google_ai_api_key || ''}
              onChange={(e) => onChange('google_ai_api_key', e.target.value)}
              placeholder="AIza..."
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Webhooks</h3>
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
            Webhook URL
          </label>
          <Input
            type="url"
            value={formData.webhook_url || ''}
            onChange={(e) => onChange('webhook_url', e.target.value)}
            placeholder="https://api.example.com/webhooks"
          />
          <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            External webhook URL for platform events
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature Flags Tab
 */
function FeatureFlagSettings({ formData, onChange }: SettingsProps) {
  return (
    <div className="space-y-4">
      <p className="text-body text-deep-navy-600 dark:text-deep-navy-200 mb-6">
        Enable or disable platform features. Changes take effect immediately.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">Perpetual Licenses</h4>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
              Allow users to purchase perpetual licenses
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.enable_perpetual_licenses !== false}
            onChange={(e) => onChange('enable_perpetual_licenses', e.target.checked)}
            className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue h-5 w-5"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">Coupons</h4>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
              Enable coupon and discount code system
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.enable_coupons !== false}
            onChange={(e) => onChange('enable_coupons', e.target.checked)}
            className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue h-5 w-5"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">Multi-Factor Authentication</h4>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
              Enable MFA feature for user accounts
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.enable_mfa !== false}
            onChange={(e) => onChange('enable_mfa', e.target.checked)}
            className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue h-5 w-5"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">Webhooks</h4>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
              Enable webhook delivery for platform events
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.enable_webhooks !== false}
            onChange={(e) => onChange('enable_webhooks', e.target.checked)}
            className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue h-5 w-5"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">Beta Features</h4>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
              Enable experimental beta features
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.enable_beta_features || false}
            onChange={(e) => onChange('enable_beta_features', e.target.checked)}
            className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue h-5 w-5"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-yellow-800">Maintenance Mode</h4>
            <p className="text-body-sm text-yellow-700">
              Put platform in maintenance mode (users cannot access)
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.maintenance_mode || false}
            onChange={(e) => onChange('maintenance_mode', e.target.checked)}
            className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-600 h-5 w-5"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md">
          <div>
            <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">Debug Mode</h4>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
              Enable verbose logging and debugging features
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.debug_mode || false}
            onChange={(e) => onChange('debug_mode', e.target.checked)}
            className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue h-5 w-5"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * System Settings Tab
 */
function SystemSettings({ formData, onChange, onClearCache, onRunBackup, isClearingCache, isRunningBackup }: SettingsProps & { onClearCache: () => void; onRunBackup: () => void; isClearingCache: boolean; isRunningBackup: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Logging Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Log Level
            </label>
            <select
              value={formData.log_level || 'info'}
              onChange={(e) => onChange('log_level', e.target.value)}
              className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Log Retention (days)
            </label>
            <Input
              type="number"
              value={formData.log_retention_days || 90}
              onChange={(e) => onChange('log_retention_days', parseInt(e.target.value) || 90)}
              placeholder="90"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Backup Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Backup Frequency
            </label>
            <select
              value={formData.backup_frequency || 'daily'}
              onChange={(e) => onChange('backup_frequency', e.target.value)}
              className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
              Last Backup
            </label>
            <div className="px-3 py-2 bg-deep-navy-50 dark:bg-deep-navy-900 border border-deep-navy-200 dark:border-deep-navy-700 rounded-md text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
              {formData.last_backup ? new Date(formData.last_backup).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={onRunBackup}
            disabled={isRunningBackup}
          >
            {isRunningBackup ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Backup Now
              </>
            )}
          </Button>
          <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-2">
            Create a full database backup now
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-deep-navy-200">
        <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Cache Management</h3>
        <div>
          <Button
            variant="ghost"
            onClick={onClearCache}
            disabled={isClearingCache}
          >
            {isClearingCache ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Clearing Cache...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Application Cache
              </>
            )}
          </Button>
          <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-2">
            Clear all cached data (Redis, in-memory caches)
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
