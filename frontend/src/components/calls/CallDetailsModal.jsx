import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatDuration, formatDateTime, formatPhoneNumber, getStatusVariant } from '../../utils/formatters';

export const CallDetailsModal = ({
  isOpen,
  onClose,
  call,
  onInitiateCall,
  isInitiating = false,
}) => {
  if (!call || !isOpen) return null;

  const canInitiate =
    call.direction === 'outgoing' &&
    call.platform_id !== undefined && // or platform === 'phone'
    call.status !== 'completed' &&
    call.status !== 'failed' &&
    call.status !== 'cancelled' &&
    !call.external_call_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Call Record #${call.id}`}
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
          {canInitiate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onInitiateCall(call.id)}
              isLoading={isInitiating}
              disabled={isInitiating}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{isInitiating ? 'Connecting...' : 'Initiate Call'}</span>
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-left text-xs">
        {/* Status Header Banner */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={call.direction === 'outgoing' ? 'blue' : 'indigo'} size="md">
              {call.direction?.toUpperCase()}
            </Badge>
            <Badge variant={getStatusVariant(call.status)} size="md">
              {call.status?.toUpperCase()}
            </Badge>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">ID: #{call.id}</span>
        </div>

        {/* Call Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Customer</span>
            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
              {call.customer_name || `Customer #${call.customer_id}`}
            </span>
            {call.customer_phone && (
              <span className="text-xs text-slate-500 font-mono block mt-0.5">
                {formatPhoneNumber(call.customer_phone)}
              </span>
            )}
          </div>

          {/* Agent */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Assigned Agent</span>
            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
              {call.agent_name || `Agent #${call.agent_id}`}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Call Type: {call.call_type || 'Voice'}</span>
          </div>

          {/* Duration */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Call Duration</span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block">
              {formatDuration(call.duration_seconds)}
            </span>
          </div>

          {/* Start Time */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Started At</span>
            <span className="text-xs font-medium text-slate-800 mt-0.5 block">
              {formatDateTime(call.start_time || call.created_at)}
            </span>
          </div>
        </div>

        {/* External Telephony ID */}
        {call.external_call_id && (
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-indigo-900 block">External Telephony Call SID</span>
              <span className="text-xs font-mono text-indigo-700 block select-all">{call.external_call_id}</span>
            </div>
            <Badge variant="blue" size="sm">Provider Connected</Badge>
          </div>
        )}

        {/* Audio Recording Player */}
        {call.recording_url && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Call Audio Recording</span>
            <audio controls className="w-full h-9 rounded-lg" src={call.recording_url}>
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* Subject & Notes */}
        {call.subject && (
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Subject</span>
            <span className="text-xs text-slate-800 font-medium mt-0.5 block">{call.subject}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
            Call Notes
          </span>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
            {call.notes || 'No call notes have been logged.'}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default CallDetailsModal;
