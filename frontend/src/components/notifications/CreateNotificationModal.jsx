import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';

const NOTIFICATION_TYPES = [
  { value: 'call_assigned', label: 'Call Assigned' },
  { value: 'follow_up_reminder', label: 'Follow-up Reminder' },
  { value: 'call_outcome_recorded', label: 'Call Outcome Recorded' },
  { value: 'system_alert', label: 'System Alert' },
  { value: 'other', label: 'Other Notification' },
];

const REFERENCE_TYPES = [
  { value: '', label: 'None' },
  { value: 'call', label: 'Call Record' },
  { value: 'follow_up', label: 'Follow-up Task' },
  { value: 'customer', label: 'Customer' },
  { value: 'outcome', label: 'Outcome' },
  { value: 'system', label: 'System' },
  { value: 'other', label: 'Other' },
];

export const CreateNotificationModal = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [userId, setUserId] = useState('');
  const [notificationType, setNotificationType] = useState('system_alert');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const data = await userService.getUsers({ limit: 100 });
        if (isMounted) {
          setUsers(data);
          if (data.length > 0) {
            setUserId(String(data[0].id));
          }
        }
      } catch (err) {
        if (isMounted) {
          setServerError(err.message || 'Failed to load user list.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchUsers();

    // Reset Form
    setTitle('');
    setMessage('');
    setNotificationType('system_alert');
    setReferenceType('');
    setReferenceId('');
    setFieldErrors({});
    setServerError('');

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  const validateForm = () => {
    const errors = {};
    if (!userId) errors.userId = 'Recipient user is required';
    if (!title.trim()) errors.title = 'Notification title is required';
    if (!message.trim()) errors.message = 'Notification message is required';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const payload = {
        user_id: parseInt(userId, 10),
        notification_type: notificationType,
        title: title.trim(),
        message: message.trim(),
        reference_type: referenceType || null,
        reference_id: referenceId ? parseInt(referenceId, 10) : null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Unable to create notification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-notification-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 id="create-notification-title" className="text-lg font-bold text-slate-900 tracking-tight">
                Send Notification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Broadcast an administrative alert or assignment reminder to an agent.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-left" noValidate>
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {serverError}
            </div>
          )}

          {/* Recipient User Select */}
          <div>
            <label htmlFor="notif-user" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Recipient User <span className="text-rose-500">*</span>
            </label>
            {isLoadingUsers ? (
              <div className="h-[46px] flex items-center px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                Loading users...
              </div>
            ) : (
              <select
                id="notif-user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[46px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.role?.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.userId && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.userId}</p>
            )}
          </div>

          {/* Type Select */}
          <div>
            <label htmlFor="notif-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Notification Type <span className="text-rose-500">*</span>
            </label>
            <select
              id="notif-type"
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-[46px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="notif-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="notif-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Urgent Follow-up Required"
              disabled={isSubmitting}
              className="w-full h-[46px] px-3.5 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
            />
            {fieldErrors.title && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="notif-msg" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="notif-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide notification details or action instructions..."
              disabled={isSubmitting}
              className="w-full p-3 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
            />
            {fieldErrors.message && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.message}</p>
            )}
          </div>

          {/* Reference Type & Reference ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="notif-ref-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reference Entity
              </label>
              <select
                id="notif-ref-type"
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[46px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              >
                {REFERENCE_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="notif-ref-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reference ID
              </label>
              <input
                id="notif-ref-id"
                type="number"
                min="1"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. 10"
                disabled={isSubmitting || !referenceType}
                className="w-full h-[46px] px-3.5 bg-white rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none disabled:bg-slate-50"
              />
            </div>
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
            disabled={isSubmitting || users.length === 0}
            className="h-[46px] px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Notification →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNotificationModal;
