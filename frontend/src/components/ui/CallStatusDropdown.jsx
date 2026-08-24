import { useState, useRef, useEffect } from 'react';

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    symbol: '✓',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70',
  },
  initiated: {
    label: 'Pending',
    symbol: '◷',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70',
  },
  ringing: {
    label: 'Pending',
    symbol: '◷',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70',
  },
  ongoing: {
    label: 'In Progress',
    symbol: '↻',
    colorClasses: 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/70',
  },
  failed: {
    label: 'Failed',
    symbol: '✕',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/70',
  },
  missed: {
    label: 'Failed',
    symbol: '✕',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/70',
  },
  cancelled: {
    label: 'Cancelled',
    symbol: '−',
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70',
  },
};

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', symbol: '✓', color: 'text-emerald-600' },
  { value: 'initiated', label: 'Pending', symbol: '◷', color: 'text-amber-600' },
  { value: 'ongoing', label: 'In Progress', symbol: '↻', color: 'text-blue-600' },
  { value: 'failed', label: 'Failed', symbol: '✕', color: 'text-rose-600' },
  { value: 'cancelled', label: 'Cancelled', symbol: '−', color: 'text-slate-600' },
];

export const CallStatusDropdown = ({
  callId,
  currentStatus = 'initiated',
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(null);

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

  const activeStatus = optimisticStatus !== null ? optimisticStatus : currentStatus;
  const normalizedStatus = activeStatus?.toLowerCase() || 'initiated';
  const config = STATUS_CONFIG[normalizedStatus] || {
    label: activeStatus,
    symbol: '●',
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70',
  };

  const handleSelect = async (newStatus) => {
    if (newStatus === normalizedStatus || isUpdating) {
      setIsOpen(false);
      return;
    }

    setOptimisticStatus(newStatus);
    setIsOpen(false);
    setIsUpdating(true);

    try {
      if (onStatusChange) {
        await onStatusChange(callId, newStatus);
      }
    } catch {
      setOptimisticStatus(null);
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
        title="Click to update call status"
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
          className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Update Status
          </div>
          {STATUS_OPTIONS.map((opt) => {
            const isSelected =
              normalizedStatus === opt.value ||
              (opt.value === 'initiated' && normalizedStatus === 'ringing');

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

export default CallStatusDropdown;
