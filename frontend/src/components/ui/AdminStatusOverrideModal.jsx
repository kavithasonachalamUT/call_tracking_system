import { useState, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';

const STATUS_OPTIONS = [
  { value: 'completed', label: '✓ Completed' },
  { value: 'initiated', label: '◷ Pending' },
  { value: 'ongoing', label: '↻ In Progress' },
  { value: 'failed', label: '✕ Failed' },
  { value: 'cancelled', label: '− Cancelled' },
];

export const AdminStatusOverrideModal = ({
  isOpen,
  onClose,
  call,
  onSubmitOverride,
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const prevCallIdRef = useRef(null);

  if (isOpen && call && call.id !== prevCallIdRef.current) {
    prevCallIdRef.current = call.id;
    const normalized =
      call.status === 'ringing'
        ? 'initiated'
        : call.status === 'missed'
        ? 'failed'
        : call.status;
    setSelectedStatus(normalized || 'completed');
    setReason('');
    setValidationError('');
  } else if (!isOpen && prevCallIdRef.current !== null) {
    prevCallIdRef.current = null;
  }

  if (!call || !isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setValidationError('A mandatory justification/reason is required for administrative audit logging.');
      return;
    }

    if (trimmedReason.length < 5) {
      setValidationError('Please provide a descriptive reason (at least 5 characters).');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    try {
      await onSubmitOverride(call, selectedStatus, trimmedReason);
      onClose();
    } catch {
      setValidationError('Failed to override status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Override Call Status (Admin Exception)"
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging...' : 'Submit Override'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Caution Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Audit Log Notice:</strong> This action overrides the telephony provider's automatic status. It will be recorded in <strong>Audit Logs</strong> with your user ID and timestamp.
          </div>
        </div>

        {/* Call Info Summary */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Call ID:</span>
            <span className="font-semibold text-slate-800">#{call.call_id || call.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-800">{call.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Status:</span>
            <span className="font-semibold uppercase text-indigo-700">{call.status}</span>
          </div>
        </div>

        {/* Corrected Status Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Corrected Status <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Justification / Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. Telephony webhook delay misreported ongoing call as failed"
            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Validation Error */}
        {validationError && (
          <p className="text-xs text-rose-600 font-medium">{validationError}</p>
        )}
      </form>
    </Modal>
  );
};

export default AdminStatusOverrideModal;
