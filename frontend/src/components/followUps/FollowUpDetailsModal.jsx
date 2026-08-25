import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  formatFollowUpType,
  formatFollowUpStatus,
  getFollowUpStatusVariant,
  formatRelativeDueTime,
  formatDateTime,
  isFollowUpOverdue,
} from '../../utils/followUpUtils';
import { formatPhoneNumber } from '../../utils/formatters';

export const FollowUpDetailsModal = ({
  isOpen,
  onClose,
  followUp,
  customer,
  agent,
  onComplete,
  onCancel,
  onEdit,
  isCompleting = false,
  isCancelling = false,
}) => {
  if (!followUp || !isOpen) return null;

  const isCompleted = followUp.status === 'completed';
  const isCancelled = followUp.status === 'cancelled';
  const isPending = !isCompleted && !isCancelled;
  const isOverdue = isFollowUpOverdue(followUp.scheduled_at, followUp.status);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Follow-up Task #${followUp.id}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>

          {isPending && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(followUp.id)}
              isLoading={isCancelling}
              disabled={isCancelling || isCompleting}
              className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
            >
              <span>Cancel Task</span>
            </Button>
          )}

          {isPending && onComplete && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onComplete(followUp.id)}
              isLoading={isCompleting}
              disabled={isCompleting || isCancelling}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{isCompleting ? 'Completing...' : 'Mark Completed'}</span>
            </Button>
          )}

          {isPending && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(followUp);
              }}
            >
              Edit Task
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-left text-xs">
        {/* Status & Type Header Banner */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-xs">
              {formatFollowUpType(followUp.follow_up_type)}
            </span>
            <Badge variant={getFollowUpStatusVariant(followUp.status, followUp.scheduled_at)} size="md">
              {formatFollowUpStatus(followUp.status, followUp.scheduled_at)?.toUpperCase()}
            </Badge>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">ID: #{followUp.id}</span>
        </div>

        {/* Due Date Relative Pill */}
        {isPending && (
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            isOverdue
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50/60 border-indigo-100 text-indigo-900'
          }`}>
            <span className="font-semibold">
              {isOverdue ? '⚠️ Overdue Notice' : '⏰ Scheduled Timing'}
            </span>
            <span className="font-medium">
              {formatRelativeDueTime(followUp.scheduled_at, followUp.status)}
            </span>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Customer</span>
            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
              {customer?.name || `Customer #${followUp.customer_id}`}
            </span>
            {customer?.phone && (
              <span className="text-xs text-slate-500 font-mono block mt-0.5">
                {formatPhoneNumber(customer.phone)}
              </span>
            )}
          </div>

          {/* Assigned Agent */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Assigned Agent</span>
            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
              {agent?.name || `User #${followUp.assigned_to}`}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Role: {agent?.role?.toUpperCase() || 'Agent'}
            </span>
          </div>

          {/* Scheduled Date */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Scheduled For</span>
            <span className="text-xs font-semibold text-slate-900 mt-0.5 block">
              {formatDateTime(followUp.scheduled_at)}
            </span>
          </div>

          {/* Associated Call */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Associated Call</span>
            <span className="text-xs font-mono font-bold text-indigo-600 mt-0.5 block">
              Call Record #{followUp.call_id}
            </span>
          </div>
        </div>

        {/* Completion Info if Completed */}
        {followUp.completed_at && (
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-900 block">Completed On</span>
              <span className="text-xs text-emerald-700 font-medium">{formatDateTime(followUp.completed_at)}</span>
            </div>
            <Badge variant="green" size="sm">✓ Finished</Badge>
          </div>
        )}

        {/* Notes */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
            Follow-up Notes / Agenda
          </span>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
            {followUp.notes || 'No follow-up notes were logged.'}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default FollowUpDetailsModal;
