import { useState, useEffect } from 'react';
import { callService } from '../../services/callService';
import { customerService } from '../../services/customerService';
import { userService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { formatPhoneNumber, formatDateTime } from '../../utils/formatters';

const FOLLOW_UP_TYPES = [
  { value: 'callback', label: '☎ Phone Callback' },
  { value: 'email', label: '✉ Email Follow-up' },
  { value: 'demo', label: '💻 Product Demo' },
  { value: 'meeting', label: '📅 Scheduled Meeting' },
  { value: 'whatsapp', label: '💬 WhatsApp Message' },
  { value: 'other', label: '📝 Other Task' },
];

const FOLLOW_UP_STATUSES = [
  { value: 'pending', label: '◷ Pending' },
  { value: 'in_progress', label: '↻ In Progress' },
  { value: 'completed', label: '✓ Completed' },
  { value: 'cancelled', label: '− Cancelled' },
  { value: 'overdue', label: '⚠ Overdue' },
];

// Helper to convert datetime string / Date to 'YYYY-MM-DDTHH:mm' local string for input
const toDateTimeLocalString = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const FollowUpFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isEditing = false,
  initialData = null,
}) => {
  const { user } = useAuth();

  const [calls, setCalls] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);

  // Form Fields
  const [callId, setCallId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [followUpType, setFollowUpType] = useState('callback');
  const [status, setStatus] = useState('pending');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default scheduled_at to tomorrow at 10:00 AM
  const getDefaultScheduledTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return toDateTimeLocalString(tomorrow);
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchDependencies = async () => {
      try {
        setIsLoadingDependencies(true);
        const [callsData, customersData, agentsData] = await Promise.all([
          callService.getCalls({ limit: 100 }).catch(() => []),
          customerService.getCustomers({ limit: 100 }).catch(() => []),
          userService.getUsers({ limit: 100 }).catch(() => []),
        ]);

        if (isMounted) {
          setCalls(callsData);
          setCustomers(customersData);
          setAgents(agentsData);

          if (!isEditing) {
            // Default setup for New Follow-up
            const defaultCall = callsData.length > 0 ? callsData[0] : null;
            if (defaultCall) {
              setCallId(String(defaultCall.id));
              setCustomerId(String(defaultCall.customer_id));
            } else if (customersData.length > 0) {
              setCustomerId(String(customersData[0].id));
            }

            setAssignedTo(String(user?.id || (agentsData[0]?.id || '1')));
            setFollowUpType('callback');
            setStatus('pending');
            setScheduledAt(getDefaultScheduledTime());
            setNotes('');
          } else if (initialData) {
            // Setup for Edit Follow-up
            setCallId(String(initialData.call_id));
            setCustomerId(String(initialData.customer_id));
            setAssignedTo(String(initialData.assigned_to));
            setFollowUpType(initialData.follow_up_type || 'callback');
            setStatus(initialData.status || 'pending');
            setScheduledAt(toDateTimeLocalString(initialData.scheduled_at));
            setNotes(initialData.notes || '');
          }
        }
      } catch (err) {
        if (isMounted) {
          setServerError(err.message || 'Failed to load form dependencies.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDependencies(false);
        }
      }
    };

    fetchDependencies();
    setFieldErrors({});
    setServerError('');

    return () => {
      isMounted = false;
    };
  }, [isOpen, isEditing, initialData, user]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // When call selection changes, synchronize customerId
  const handleCallChange = (newCallId) => {
    setCallId(newCallId);
    const selectedCall = calls.find((c) => String(c.id) === String(newCallId));
    if (selectedCall) {
      setCustomerId(String(selectedCall.customer_id));
    }
    if (fieldErrors.callId) {
      setFieldErrors((prev) => ({ ...prev, callId: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!callId) errors.callId = 'Associated call is required';
    if (!customerId) errors.customerId = 'Associated customer is required';
    if (!assignedTo) errors.assignedTo = 'Assigned agent is required';
    if (!scheduledAt) errors.scheduledAt = 'Scheduled date and time is required';

    if (scheduledAt) {
      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        errors.scheduledAt = 'Please provide a valid date and time';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const scheduledIso = new Date(scheduledAt).toISOString();

      const payload = {
        call_id: parseInt(callId, 10),
        customer_id: parseInt(customerId, 10),
        assigned_to: parseInt(assignedTo, 10),
        follow_up_type: followUpType,
        status,
        scheduled_at: scheduledIso,
        notes: notes.trim() || null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setServerError(
        err.message || 'Unable to save follow-up task. Please check details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomerObj = customers.find((c) => String(c.id) === String(customerId));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-form-title"
    >
      {/* Dimmed Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Centered Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 id="follow-up-form-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Follow-up Task' : 'Schedule New Follow-up'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? 'Update callback schedule, task type, and assigned agent.'
                  : 'Create a callback, demo, or customer engagement reminder.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-left" noValidate>
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="font-semibold block">Submission Error</span>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {/* 1. Associated Call & Customer Selection */}
          <div className="space-y-3">
            <div>
              <label htmlFor="associated-call" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Associated Call Record <span className="text-rose-500">*</span>
              </label>
              {isLoadingDependencies ? (
                <div className="h-[50px] flex items-center px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                  Loading call records...
                </div>
              ) : calls.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  No active calls available. Please log a call first before scheduling a follow-up.
                </div>
              ) : (
                <select
                  id="associated-call"
                  value={callId}
                  onChange={(e) => handleCallChange(e.target.value)}
                  disabled={isSubmitting || isEditing}
                  className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {calls.map((c) => {
                    const cust = customers.find((cu) => cu.id === c.customer_id);
                    return (
                      <option key={c.id} value={c.id}>
                        Call #{c.id} — {cust ? cust.name : `Customer #${c.customer_id}`} ({formatDateTime(c.start_time || c.created_at)})
                      </option>
                    );
                  })}
                </select>
              )}
              {fieldErrors.callId && (
                <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.callId}</p>
              )}
            </div>

            {/* Linked Customer Preview Tag */}
            {selectedCustomerObj && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    {selectedCustomerObj.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">{selectedCustomerObj.name}</span>
                    <span className="text-slate-500 ml-2 font-mono">{formatPhoneNumber(selectedCustomerObj.phone)}</span>
                  </div>
                </div>
                {selectedCustomerObj.company && (
                  <span className="text-indigo-700 font-medium">{selectedCustomerObj.company}</span>
                )}
              </div>
            )}
          </div>

          {/* 2. Type & Status in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="follow-up-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Task Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="follow-up-type"
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              >
                {FOLLOW_UP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="follow-up-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                id="follow-up-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              >
                {FOLLOW_UP_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Assigned Agent & Scheduled Date/Time in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="assigned-agent" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Agent <span className="text-rose-500">*</span>
              </label>
              <select
                id="assigned-agent"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.role?.toUpperCase()})
                  </option>
                ))}
              </select>
              {fieldErrors.assignedTo && (
                <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.assignedTo}</p>
              )}
            </div>

            <div>
              <label htmlFor="scheduled-at" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Scheduled Date & Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              />
              {fieldErrors.scheduledAt && (
                <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.scheduledAt}</p>
              )}
            </div>
          </div>

          {/* 4. Notes Textarea */}
          <div>
            <label htmlFor="follow-up-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Notes / Agenda <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="follow-up-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key discussion points, requested demo features, or next conversation steps..."
              disabled={isSubmitting}
              className="w-full p-3 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-[46px] px-5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400/20"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || calls.length === 0}
            className="h-[46px] px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isEditing ? 'Saving Changes...' : 'Scheduling Follow-up...'}</span>
              </>
            ) : (
              <span>{isEditing ? 'Save Changes' : 'Schedule Follow-up →'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpFormModal;
