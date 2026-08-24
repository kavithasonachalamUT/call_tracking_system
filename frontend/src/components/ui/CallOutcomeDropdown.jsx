import { useState, useRef, useEffect } from 'react';

const OUTCOME_CONFIG = {
  interested: {
    label: 'Interested',
    symbol: '●',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70',
  },
  follow_up_required: {
    label: 'Follow-up Required',
    symbol: '◷',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70',
  },
  callback_requested: {
    label: 'Callback Requested',
    symbol: '☎',
    colorClasses: 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/70',
  },
  converted: {
    label: 'Converted',
    symbol: '✓',
    colorClasses: 'bg-purple-50 text-purple-700 border-purple-200/80 hover:bg-purple-100/70',
  },
  not_interested: {
    label: 'Not Interested',
    symbol: '✕',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/70',
  },
  no_response: {
    label: 'No Response',
    symbol: '−',
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70',
  },
};

const OUTCOME_OPTIONS = [
  { value: 'interested', label: 'Interested', symbol: '●', color: 'text-emerald-600' },
  { value: 'follow_up_required', label: 'Follow-up Required', symbol: '◷', color: 'text-amber-600' },
  { value: 'callback_requested', label: 'Callback Requested', symbol: '☎', color: 'text-blue-600' },
  { value: 'converted', label: 'Converted', symbol: '✓', color: 'text-purple-600' },
  { value: 'not_interested', label: 'Not Interested', symbol: '✕', color: 'text-rose-600' },
  { value: 'no_response', label: 'No Response', symbol: '−', color: 'text-slate-500' },
];

export const CallOutcomeDropdown = ({
  callId,
  currentOutcome,
  onOutcomeChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticOutcome, setOptimisticOutcome] = useState(null);

  const containerRef = useRef(null);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOutcome = optimisticOutcome !== null ? optimisticOutcome : currentOutcome;
  const normalizedOutcome = activeOutcome?.toLowerCase() || '';
  const config = OUTCOME_CONFIG[normalizedOutcome] || {
    label: activeOutcome || 'Pending',
    symbol: activeOutcome ? '●' : '○',
    colorClasses: activeOutcome
      ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
      : 'bg-amber-50/80 text-amber-700 border-amber-200/70 hover:bg-amber-100/80',
  };

  const handleSelect = async (newOutcome) => {
    if (newOutcome === normalizedOutcome || isUpdating) {
      setIsOpen(false);
      return;
    }

    setOptimisticOutcome(newOutcome);
    setIsOpen(false);
    setIsUpdating(true);

    try {
      if (onOutcomeChange) {
        await onOutcomeChange(callId, newOutcome);
      }
    } catch {
      setOptimisticOutcome(null);
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.colorClasses}`}
      >
        <span className="font-bold">{config.symbol}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Clickable Pill Button */}
      <button
        type="button"
        onClick={() => !isUpdating && setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98] ${
          config.colorClasses
        } ${isOpen ? 'ring-2 ring-indigo-500/30' : ''}`}
        title="Click to update call outcome"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isUpdating ? (
          <svg className="w-3.5 h-3.5 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <span className="font-bold mr-0.5">{config.symbol}</span>
        )}

        <span>{isUpdating ? 'Updating...' : config.label}</span>

        <span className={`ml-0.5 text-[10px] opacity-70 font-normal transition-transform duration-150 ${isOpen ? 'rotate-180 inline-block' : ''}`}>
          ▾
        </span>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Update Outcome
          </div>
          {OUTCOME_OPTIONS.map((opt) => {
            const isSelected = normalizedOutcome === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 font-semibold text-indigo-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`font-bold ${opt.color}`}>{opt.symbol}</span>
                  <span>{opt.label}</span>
                </span>
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

export default CallOutcomeDropdown;
