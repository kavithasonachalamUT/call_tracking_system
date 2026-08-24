import { useState, useRef, useEffect } from 'react';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: '✓ Completed' },
  { value: 'initiated', label: '◷ Pending' },
  { value: 'ongoing', label: '↻ In Progress' },
  { value: 'failed', label: '✕ Failed' },
  { value: 'cancelled', label: '− Cancelled' },
];

const DIRECTION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Directions' },
  { value: 'incoming', label: '↙ Incoming' },
  { value: 'outgoing', label: '↗ Outgoing' },
];

const OUTCOME_FILTER_OPTIONS = [
  { value: 'all', label: 'All Outcomes' },
  { value: 'interested', label: '● Interested' },
  { value: 'follow_up_required', label: '◷ Follow-up Required' },
  { value: 'callback_requested', label: '☎ Callback Requested' },
  { value: 'converted', label: '✓ Converted' },
  { value: 'not_interested', label: '✕ Not Interested' },
  { value: 'no_response', label: '− No Response' },
  { value: 'pending', label: '○ Pending' },
];

const FilterDropdown = ({
  label,
  options,
  selectedValue,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === selectedValue) || options[0];
  const isFiltered = selectedValue && selectedValue !== 'all';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          isFiltered
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-300/40'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-slate-400 font-medium">{label}:</span>
        <span className="text-slate-800">{selectedOption.label}</span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Filter by {label}
          </div>
          {options.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 font-semibold text-indigo-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const CallFilterBar = ({
  statusFilter = 'all',
  directionFilter = 'all',
  outcomeFilter = 'all',
  onStatusChange,
  onDirectionChange,
  onOutcomeChange,
  onClearFilters,
}) => {
  const isAnyFilterActive =
    statusFilter !== 'all' ||
    directionFilter !== 'all' ||
    outcomeFilter !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100">
      {/* Filter Label / Icon */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="hidden sm:inline">Filters:</span>
      </div>

      {/* 1. Status Filter */}
      <FilterDropdown
        label="Status"
        options={STATUS_FILTER_OPTIONS}
        selectedValue={statusFilter}
        onChange={onStatusChange}
      />

      {/* 2. Direction Filter */}
      <FilterDropdown
        label="Direction"
        options={DIRECTION_FILTER_OPTIONS}
        selectedValue={directionFilter}
        onChange={onDirectionChange}
      />

      {/* 3. Outcome Filter */}
      <FilterDropdown
        label="Outcome"
        options={OUTCOME_FILTER_OPTIONS}
        selectedValue={outcomeFilter}
        onChange={onOutcomeChange}
      />

      {/* 4. Clear Filters Action Button */}
      {isAnyFilterActive && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Reset all filters"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Clear Filters</span>
        </button>
      )}
    </div>
  );
};

export default CallFilterBar;
