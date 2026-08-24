import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatDateTime, getStatusVariant } from '../../utils/formatters';

const formatJsonValues = (val) => {
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return val;
  }
};

export const AuditLogDetailsModal = ({
  isOpen,
  onClose,
  auditLog,
}) => {
  if (!auditLog || !isOpen) return null;

  const oldValuesFormatted = formatJsonValues(auditLog.old_values);
  const newValuesFormatted = formatJsonValues(auditLog.new_values);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Audit Log Record #${auditLog.id}`}
      maxWidth="max-w-xl"
      footer={
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      }
    >
      <div className="space-y-4 text-left text-xs">
        {/* Header Summary Banner */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(auditLog.action)} size="md">
              {auditLog.action?.toUpperCase()}
            </Badge>
            <Badge variant="gray" size="md">
              {auditLog.entity_type?.toUpperCase()}
            </Badge>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">ID: #{auditLog.id}</span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* User Info */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">User / Actor</span>
            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
              {auditLog.user_name || (auditLog.user_id ? `User #${auditLog.user_id}` : 'System')}
            </span>
            {auditLog.user_email && (
              <span className="text-xs text-slate-500 block mt-0.5">{auditLog.user_email}</span>
            )}
          </div>

          {/* Timestamp */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Timestamp</span>
            <span className="text-xs font-semibold text-slate-900 mt-0.5 block">
              {formatDateTime(auditLog.created_at)}
            </span>
            {auditLog.ip_address && (
              <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                IP: {auditLog.ip_address}
              </span>
            )}
          </div>

          {/* Entity Type */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Entity Type</span>
            <span className="text-xs font-semibold text-slate-800 mt-0.5 block capitalize">
              {auditLog.entity_type.replace('_', ' ')}
            </span>
          </div>

          {/* Entity ID */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Entity ID</span>
            <span className="text-xs font-mono font-bold text-indigo-600 mt-0.5 block">
              {auditLog.entity_id !== null && auditLog.entity_id !== undefined ? `#${auditLog.entity_id}` : '—'}
            </span>
          </div>
        </div>

        {/* Description */}
        {auditLog.description && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
              Audit Description / Justification
            </span>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
              {auditLog.description}
            </p>
          </div>
        )}

        {/* Old / New Values State Changes */}
        {(oldValuesFormatted || newValuesFormatted) && (
          <div className="space-y-3 pt-1">
            <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
              State Modifications
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {oldValuesFormatted && (
                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <span className="text-[11px] font-semibold text-rose-800 block mb-1">Previous State</span>
                  <pre className="text-[11px] font-mono text-rose-900 overflow-x-auto whitespace-pre-wrap bg-white/70 p-2 rounded-lg border border-rose-200/50">
                    {oldValuesFormatted}
                  </pre>
                </div>
              )}

              {newValuesFormatted && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="text-[11px] font-semibold text-emerald-800 block mb-1">New State</span>
                  <pre className="text-[11px] font-mono text-emerald-900 overflow-x-auto whitespace-pre-wrap bg-white/70 p-2 rounded-lg border border-emerald-200/50">
                    {newValuesFormatted}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AuditLogDetailsModal;
