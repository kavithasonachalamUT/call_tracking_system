import { useEffect } from 'react';

export const Toast = ({
  message,
  type = 'success',
  onDismiss,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
          isSuccess
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-rose-900 text-white border-rose-800'
        }`}
      >
        {isSuccess ? (
          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
            ✓
          </span>
        ) : (
          <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px]">
            ✕
          </span>
        )}
        <span>{message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss toast"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
