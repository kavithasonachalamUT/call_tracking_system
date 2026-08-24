const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    symbol: '✓',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  initiated: {
    label: 'Pending',
    symbol: '◷',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  ringing: {
    label: 'Pending',
    symbol: '◷',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  ongoing: {
    label: 'In Progress',
    symbol: '↻',
    colorClasses: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  failed: {
    label: 'Failed',
    symbol: '✕',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  missed: {
    label: 'Failed',
    symbol: '✕',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  cancelled: {
    label: 'Cancelled',
    symbol: '−',
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const CallStatusBadge = ({
  status = 'initiated',
  call,
  isAdmin = false,
  onOpenOverride,
}) => {
  const normalizedStatus = status?.toLowerCase() || 'initiated';
  const config = STATUS_CONFIG[normalizedStatus] || {
    label: status,
    symbol: '●',
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Static System-Generated Status Badge */}
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs cursor-default select-none ${config.colorClasses}`}
        title="System-generated telephony provider status"
      >
        <span className="font-bold">{config.symbol}</span>
        <span>{config.label}</span>
      </span>

      {/* Admin-Only Override Trigger */}
      {isAdmin && onOpenOverride && (
        <button
          type="button"
          onClick={() => onOpenOverride(call)}
          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          title="Admin: Override status (Logged in Audit Logs)"
          aria-label="Admin Override Status"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default CallStatusBadge;
