import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

const STATUS_OPTIONS = [
  { value: 'completed', label: '✓ Completed' },
  { value: 'initiated', label: '◷ Pending' },
  { value: 'ongoing', label: '↻ In Progress' },
  { value: 'failed', label: '✕ Failed' },
  { value: 'cancelled', label: '− Cancelled' },
];

const AdminStatusOverrideModalInner = ({
  isOpen,
  onClose,
  call,
  onSubmitOverride,
}) => {
  const normalizedInitialStatus =
    call.status === 'ringing'
      ? 'initiated'
      : call.status === 'missed'
      ? 'failed'
      : call.status;

  const [selectedStatus, setSelectedStatus] = useState(normalizedInitialStatus || 'completed');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

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
      await onSubmitOverride(call.call_id || call.id, selectedStatus, trimmedReason);
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Status Override"
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
            disabled={isSubmitting || selectedStatus === call.status}
          >
            Update Call Status
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Call Summary Banner */}
        <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-purple-900">
              Call #{call.call_id || call.id}
            </span>
            <span className="text-purple-700 ml-2">
              Customer: {call.customer_name || 'Direct / Unknown'}
            </span>
          </div>
          <span className="font-mono text-purple-800 uppercase px-2 py-0.5 bg-purple-100/80 rounded-md font-bold text-[10px]">
            Current: {call.status}
          </span>
        </div>

        {/* Validation / Server Error Banner */}
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{validationError}</span>
          </div>
        )}

        {/* New Status Select */}
        <div>
          <label htmlFor="admin-override-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
            New Call Status <span className="text-rose-500">*</span>
          </label>
          <select
            id="admin-override-status"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setValidationError('');
            }}
            disabled={isSubmitting}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            Select the desired status to manually set for this call record.
          </p>
        </div>

        {/* Justification / Reason Textarea */}
        <div>
          <label htmlFor="admin-override-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Administrative Justification <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="admin-override-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder="Explain why this manual status override is necessary (e.g. Telephony webhook timeout / agent disconnection resolution)..."
            disabled={isSubmitting}
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            This justification will be recorded permanently in the system Audit Log.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export const AdminStatusOverrideModal = ({
  isOpen,
  onClose,
  call,
  onSubmitOverride,
}) => {
  if (!call || !isOpen) return null;

  return (
    <AdminStatusOverrideModalInner
      key={call.call_id || call.id}
      isOpen={isOpen}
      onClose={onClose}
      call={call}
      onSubmitOverride={onSubmitOverride}
    />
  );
};

export default AdminStatusOverrideModal;
