import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface AdminPaginationProps {
  currentPage: number; // 1-indexed (starts at 1, not 0)
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void; // 1-indexed
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

/**
 * AdminPagination Component
 *
 * CRITICAL: 1-indexed pagination (not 0-indexed) to match Plans 109/110
 *
 * Features:
 * - Page number input (1-indexed display)
 * - Previous/Next buttons
 * - Per-page selector dropdown
 * - Page info display: "Showing 1-25 of 100 results"
 * - All page numbers 1-indexed in UI and callbacks
 * - Deep Navy theme
 * - Keyboard accessible
 */
const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Calculate display range (1-indexed)
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);

    // Validate page number (1-indexed)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      // Reset to current page if invalid
      setPageInput(String(currentPage));
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  };

  // Sync page input with currentPage
  React.useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-deep-navy-200">
      {/* Left: Page info */}
      <div className="text-sm text-deep-navy-600">
        Showing <span className="font-medium text-deep-navy-800">{startItem}</span> to{' '}
        <span className="font-medium text-deep-navy-800">{endItem}</span> of{' '}
        <span className="font-medium text-deep-navy-800">{totalItems}</span> results
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-deep-navy-300 text-deep-navy-600 hover:bg-deep-navy-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-rephlo-blue"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page input */}
        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
          <span className="text-sm text-deep-navy-600">Page</span>
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            className="w-16 px-2 py-1 text-center border border-deep-navy-300 rounded-lg text-sm text-deep-navy-700 focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-transparent transition-all"
            aria-label="Current page"
          />
          <span className="text-sm text-deep-navy-600">of {totalPages}</span>
        </form>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-deep-navy-300 text-deep-navy-600 hover:bg-deep-navy-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-rephlo-blue"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Per-page selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-deep-navy-600">
            Per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="px-3 py-1 border border-deep-navy-300 rounded-lg text-sm text-deep-navy-700 focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-transparent transition-all"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default AdminPagination;
