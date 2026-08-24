export const ErrorMessage = ({
  message = 'An error occurred while loading data.',
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!message) return null;

  return (
    <div className={`p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm font-medium">
          {message}
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-3 text-red-700 underline font-semibold hover:text-red-900 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 cursor-pointer"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
