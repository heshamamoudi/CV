import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function PageIndicator({ currentPage, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {/* Previous button */}
      <button
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        className={`p-1.5 rounded-full transition-all ${
          currentPage === 0 
            ? 'text-space-muted cursor-not-allowed' 
            : 'text-space-secondary hover:text-space-accent hover:bg-space-accent/10'
        }`}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => onPageChange(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === currentPage 
                ? 'w-6 h-2 bg-space-accent' 
                : 'w-2 h-2 bg-space-muted hover:bg-space-secondary'
            }`}
          />
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage === totalPages - 1}
        className={`p-1.5 rounded-full transition-all ${
          currentPage === totalPages - 1 
            ? 'text-space-muted cursor-not-allowed' 
            : 'text-space-secondary hover:text-space-accent hover:bg-space-accent/10'
        }`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default PageIndicator;
