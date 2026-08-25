import { useState, useEffect } from 'react';
import { auditLogService } from '../../services/auditLogService';
import {
  formatAuditAction,
  getAuditActionVariant,
  formatAuditDate,
  formatAuditRelativeTime,
} from '../../utils/auditLogUtils';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import ErrorMessage from '../common/ErrorMessage';

const CallAuditTrailContent = ({ initialCallId }) => {
  const [callIdInput, setCallIdInput] = useState(initialCallId ? String(initialCallId) : '');
  const [currentCallId, setCurrentCallId] = useState(initialCallId);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentCallId) return;

    let isMounted = true;
    const fetchTrail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await auditLogService.getCallAuditTrail(parseInt(currentCallId, 10));
        if (isMounted) {
          const sorted = [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          setLogs(sorted);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || `Failed to load audit history for Call #${currentCallId}.`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTrail();

    return () => {
      isMounted = false;
    };
  }, [currentCallId]);

  const handleSearchCall = (e) => {
    e.preventDefault();
    const parsed = parseInt(callIdInput.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setCurrentCallId(parsed);
    }
  };

  return (
    <div className="space-y-4 text-left text-xs">
      {/* Call ID input / lookup header */}
      <form onSubmit={handleSearchCall} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
        <span className="text-xs font-semibold text-slate-500 pl-2">Call ID:</span>
        <input
          type="number"
          min="1"
          value={callIdInput}
          onChange={(e) => setCallIdInput(e.target.value)}
          placeholder="Enter call ID (e.g. 12)"
          className="flex-1 h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <Button variant="primary" size="sm" type="submit" className="h-8 text-xs">
          View Trail
        </Button>
      </form>

      {/* Error Alert */}
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
        />
      )}

      {/* Timeline View */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <LoadingSpinner size="md" />
          <p className="mt-2 text-xs font-medium text-slate-500">Querying call lifecycle events...</p>
        </div>
      ) : !currentCallId ? (
        <div className="py-8 text-center text-slate-400">
          Enter a Call ID above to inspect its complete chronological audit trail.
        </div>
      ) : logs.length === 0 ? (
        <div className="p-6 bg-slate-50 rounded-xl text-center">
          <EmptyState
            title={`No audit records for Call #${currentCallId}`}
            description="Actions taken on this call or by assigned agents will appear chronologically."
          />
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 max-h-96 overflow-y-auto pr-1">
          {logs.map((item, idx) => (
            <div key={item.id || idx} className="relative group">
              {/* Node dot */}
              <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50 shadow-xs" />

              <div className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getAuditActionVariant(item.action)} size="sm">
                      {formatAuditAction(item.action)}
                    </Badge>
                    <span className="font-semibold text-slate-900">
                      {item.user_name || (item.user_id ? `User #${item.user_id}` : 'System')}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono" title={formatAuditDate(item.created_at)}>
                    {formatAuditRelativeTime(item.created_at)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Audit #{item.id}</span>
                  <span>{formatAuditDate(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CallAuditTrailModal = ({
  isOpen,
  onClose,
  initialCallId = null,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Call Audit Trail Timeline"
      maxWidth="max-w-xl"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <CallAuditTrailContent
        key={initialCallId || 'new'}
        initialCallId={initialCallId}
      />
    </Modal>
  );
};

export default CallAuditTrailModal;
