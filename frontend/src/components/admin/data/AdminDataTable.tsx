import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LoadingState from '../utility/LoadingState';
import EmptyState from '../utility/EmptyState';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * AdminDataTable Component
 *
 * Sortable, filterable, paginated data table.
 * Features:
 * - Sortable columns
 * - Row selection (optional with checkboxes)
 * - Loading state with spinner overlay
 * - Empty state when no data
 * - Error state display
 * - Responsive: Horizontal scroll on mobile
 * - Deep Navy theme
 * - Keyboard accessible
 * - Click handler for rows
 */
function AdminDataTable<T extends { id?: any }>({
  columns,
  data,
  loading = false,
  error,
  onRowClick,
  selectable = false,
  onSelectionChange,
}: AdminDataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn || sortDirection === null) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // Handle sort
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    if (sortColumn === column.key) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  // Handle row selection
  const handleSelectRow = (row: T) => {
    const rowId = row.id || JSON.stringify(row);
    const newSelected = new Set(selectedRows);

    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }

    setSelectedRows(newSelected);

    // Notify parent
    if (onSelectionChange) {
      const selectedData = data.filter((r) => {
        const id = r.id || JSON.stringify(r);
        return newSelected.has(id);
      });
      onSelectionChange(selectedData);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = data.map((r) => r.id || JSON.stringify(r));
      setSelectedRows(new Set(allIds));
      onSelectionChange?.(data);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-8">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-8">
        <EmptyState title="No data available" description="There are no records to display." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 overflow-hidden">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <LoadingState message="Loading data..." />
        </div>
      )}

      {/* Table wrapper for horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-deep-navy-200">
          <thead className="bg-deep-navy-50">
            <tr>
              {/* Selection checkbox column */}
              {selectable && (
                <th className="w-12 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-rephlo-blue border-deep-navy-300 rounded focus:ring-rephlo-blue focus:ring-2"
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {/* Data columns */}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center gap-2 hover:text-rephlo-blue transition-colors focus:outline-none focus:text-rephlo-blue"
                      aria-label={`Sort by ${column.label}`}
                    >
                      <span>{column.label}</span>
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  ) : (
                    <span>{column.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-deep-navy-100">
            {sortedData.map((row, rowIndex) => {
              const rowId = row.id || JSON.stringify(row);
              const isSelected = selectedRows.has(rowId);

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-deep-navy-50' : ''}
                    ${isSelected ? 'bg-rephlo-blue/5' : ''}
                  `}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {/* Selection checkbox cell */}
                  {selectable && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(row)}
                        className="w-4 h-4 text-rephlo-blue border-deep-navy-300 rounded focus:ring-rephlo-blue focus:ring-2"
                        aria-label={`Select row ${rowIndex + 1}`}
                      />
                    </td>
                  )}

                  {/* Data cells */}
                  {columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td
                        key={String(column.key)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-700"
                      >
                        {column.render ? column.render(value, row) : String(value ?? '')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDataTable;
