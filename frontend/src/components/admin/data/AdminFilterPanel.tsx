import React, { useState } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown, Filter } from 'lucide-react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface AdminFilterPanelProps {
  filters: FilterConfig[];
  onApply: (filters: Record<string, any>) => void;
  onReset: () => void;
  initialValues?: Record<string, any>;
}

/**
 * AdminFilterPanel Component
 *
 * Collapsible filter panel with form inputs.
 * Features:
 * - Headless UI Disclosure for collapse/expand
 * - Form inputs styled with Tailwind
 * - Apply button triggers onApply with filter values
 * - Reset button clears all filters and triggers onReset
 * - Supports text, select, date, and number inputs
 * - Deep Navy theme
 * - Keyboard accessible
 */
const AdminFilterPanel: React.FC<AdminFilterPanelProps> = ({
  filters,
  onApply,
  onReset,
  initialValues = {},
}) => {
  const [filterValues, setFilterValues] = useState<Record<string, any>>(initialValues);

  const handleChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(filterValues);
  };

  const handleReset = () => {
    setFilterValues({});
    onReset();
  };

  const renderInput = (filter: FilterConfig) => {
    const value = filterValues[filter.key] ?? '';

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            id={filter.key}
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 rounded-lg text-sm text-deep-navy-700 dark:text-deep-navy-100 bg-white dark:bg-deep-navy-800 placeholder-deep-navy-600 dark:placeholder-deep-navy-300 focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-transparent transition-all"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={filter.key}
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 rounded-lg text-sm text-deep-navy-700 dark:text-deep-navy-100 bg-white dark:bg-deep-navy-800 placeholder-deep-navy-600 dark:placeholder-deep-navy-300 focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-transparent transition-all"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={filter.key}
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 rounded-lg text-sm text-deep-navy-700 dark:text-deep-navy-100 bg-white dark:bg-deep-navy-800 focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-transparent transition-all"
          />
        );

      case 'select':
        return (
          <select
            id={filter.key}
            value={value}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 rounded-lg text-sm text-deep-navy-700 dark:text-deep-navy-100 bg-white dark:bg-deep-navy-800 focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-transparent transition-all"
          >
            <option value="">
              {filter.placeholder || `Select ${filter.label.toLowerCase()}`}
            </option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
          <Disclosure.Button className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-rephlo-blue dark:text-electric-cyan" />
              <span className="font-medium text-deep-navy-800 dark:text-white">Filters</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-deep-navy-600 dark:text-deep-navy-200 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </Disclosure.Button>

          <Disclosure.Panel className="px-6 py-4 border-t border-deep-navy-200 dark:border-deep-navy-700">
            {/* Filter inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {filters.map((filter) => (
                <div key={filter.key}>
                  <label
                    htmlFor={filter.key}
                    className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1"
                  >
                    {filter.label}
                  </label>
                  {renderInput(filter)}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-rephlo-blue dark:bg-electric-cyan text-white dark:text-deep-navy-900 rounded-lg font-medium text-sm hover:bg-rephlo-blue/90 dark:hover:bg-electric-cyan/90 focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:ring-offset-2 dark:focus:ring-offset-deep-navy-800 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-deep-navy-100 dark:bg-deep-navy-700 text-deep-navy-700 dark:text-deep-navy-100 rounded-lg font-medium text-sm hover:bg-deep-navy-200 dark:hover:bg-deep-navy-600 focus:outline-none focus:ring-2 focus:ring-deep-navy-300 dark:focus:ring-deep-navy-500 focus:ring-offset-2 dark:focus:ring-offset-deep-navy-800 transition-colors"
              >
                Reset
              </button>
            </div>
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
};

export default AdminFilterPanel;
