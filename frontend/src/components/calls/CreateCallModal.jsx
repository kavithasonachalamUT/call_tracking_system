import { useState, useEffect, useRef } from 'react';
import { customerService } from '../../services/customerService';
import { formatPhoneNumber } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: 'initiated', label: '◷ Pending' },
  { value: 'ongoing', label: '↻ In Progress' },
  { value: 'completed', label: '✓ Completed' },
  { value: 'failed', label: '✕ Failed' },
  { value: 'cancelled', label: '− Cancelled' },
];

const OUTCOME_OPTIONS = [
  { value: 'pending', label: '○ Pending' },
  { value: 'interested', label: '● Interested' },
  { value: 'follow_up_required', label: '◷ Follow-up Required' },
  { value: 'callback_requested', label: '☎ Callback Requested' },
  { value: 'converted', label: '✓ Converted' },
  { value: 'not_interested', label: '✕ Not Interested' },
  { value: 'no_response', label: '− No Response' },
];

export const CreateCallModal = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [direction, setDirection] = useState('outgoing');
  const [platform, setPlatform] = useState('phone');
  const [status, setStatus] = useState('initiated');
  const [durationMinutes, setDurationMinutes] = useState('00');
  const [durationSeconds, setDurationSeconds] = useState('00');
  const [outcome, setOutcome] = useState('pending');
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerDropdownRef = useRef(null);

  // Fetch active customers when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchCustomers = async () => {
      try {
        setIsLoadingCustomers(true);
        const data = await customerService.getCustomers({ limit: 100 });
        if (isMounted) {
          setCustomers(data);
        }
      } catch (err) {
        if (isMounted) {
          setServerError(err.message || 'Unable to load customer list.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomers(false);
          setSelectedCustomer(null);
          setCustomerSearchQuery('');
          setIsCustomerDropdownOpen(false);
          setDirection('outgoing');
          setPlatform('phone');
          setStatus('initiated');
          setDurationMinutes('00');
          setDurationSeconds('00');
          setOutcome('pending');
          setNotes('');
          setSubject('');
          setFieldErrors({});
          setServerError('');
        }
      }
    };

    fetchCustomers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Click outside listener for customer combobox
  useEffect(() => {
    if (!isCustomerDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCustomerDropdownOpen]);

  // Escape key listener for modal
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

  // Filter customers matching query
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(customer.name);
    setIsCustomerDropdownOpen(false);
    if (fieldErrors.customer) {
      setFieldErrors((prev) => ({ ...prev, customer: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!selectedCustomer) {
      errors.customer = 'Customer is required';
    }
    if (!direction) {
      errors.direction = 'Call direction is required';
    }
    if (!status) {
      errors.status = 'Call status is required';
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
      const mins = parseInt(durationMinutes, 10) || 0;
      const secs = parseInt(durationSeconds, 10) || 0;
      const totalDurationSeconds = mins * 60 + secs;

      const payload = {
        customer_id: selectedCustomer.id,
        direction,
        platform: platform || 'phone',
        status,
        duration_seconds: totalDurationSeconds > 0 ? totalDurationSeconds : null,
        subject: subject.trim() || null,
        notes: notes.trim() || null,
        outcome: outcome !== 'pending' ? outcome : null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setServerError(
        err.message || 'Unable to create call. Please check the information and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-call-modal-title"
    >
      {/* Soft Dimmed & Blurred Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Centered Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* 1. Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <h2 id="new-call-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                New Call
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Log a new customer call and track the conversation outcome.
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

        {/* 2. Scrollable Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-left" noValidate>
          {/* Server Error Notice */}
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="font-semibold block">Unable to create call</span>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {/* 1. Searchable Customer Combobox */}
          <div className="relative" ref={customerDropdownRef}>
            <label htmlFor="customer-search-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <input
                id="customer-search-input"
                type="text"
                value={customerSearchQuery}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                  if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                    setSelectedCustomer(null);
                  }
                }}
                placeholder="Search or select a customer..."
                disabled={isSubmitting || isLoadingCustomers}
                className={`w-full h-[50px] pl-10 pr-10 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border transition-all focus:outline-none focus:ring-2 ${
                  fieldErrors.customer
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20'
                }`}
              />

              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <svg
                  className={`w-4 h-4 transition-transform duration-150 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Selected Customer Tag Preview */}
            {selectedCustomer && (
              <div className="mt-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">{selectedCustomer.name}</span>
                    <span className="text-slate-400 ml-1.5 font-mono">{formatPhoneNumber(selectedCustomer.phone)}</span>
                  </div>
                </div>
                {selectedCustomer.company && (
                  <span className="text-indigo-700 font-medium text-[11px]">{selectedCustomer.company}</span>
                )}
              </div>
            )}

            {/* Customer Dropdown Results List */}
            {isCustomerDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {isLoadingCustomers ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading customers...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No customers found matching "{customerSearchQuery}"
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/60 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{c.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{formatPhoneNumber(c.phone)}</div>
                      </div>
                      {c.company && (
                        <span className="text-[11px] text-slate-500 font-medium">{c.company}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {fieldErrors.customer && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{fieldErrors.customer}</span>
              </p>
            )}
          </div>

          {/* 2. Call Direction Segmented Control */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Call Direction <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDirection('incoming')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  direction === 'incoming'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>☎</span>
                <span>Incoming</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('outgoing')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  direction === 'outgoing'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>↗</span>
                <span>Outgoing</span>
              </button>
            </div>
          </div>

          {/* 3. Platform, Status & Outcome Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Platform */}
            <div>
              <label htmlFor="call-platform" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Platform <span className="text-rose-500">*</span>
              </label>
              <select
                id="call-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none cursor-pointer"
              >
                <option value="phone">☎ Phone</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="google_meet">💻 Google Meet</option>
                <option value="microsoft_teams">👥 Teams</option>
                <option value="zoom">📹 Zoom</option>
                <option value="other">📝 Other</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="call-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                id="call-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome */}
            <div>
              <label htmlFor="call-outcome" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Outcome
              </label>
              <select
                id="call-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[50px] px-3.5 bg-white rounded-xl text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none cursor-pointer"
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Duration (MM : SS) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Duration
            </label>
            <div className="flex items-center gap-2 max-w-[200px]">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="599"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="00"
                  className="w-full h-[46px] px-3 text-center bg-white rounded-xl text-sm font-mono text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 text-center block mt-1">minutes</span>
              </div>

              <span className="text-slate-400 font-bold text-lg mb-4">:</span>

              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  placeholder="00"
                  className="w-full h-[46px] px-3 text-center bg-white rounded-xl text-sm font-mono text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 text-center block mt-1">seconds</span>
              </div>
            </div>
          </div>

          {/* 5. Subject / Topic (Optional) */}
          <div>
            <label htmlFor="call-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject / Topic <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="call-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Initial Demo, Contract Negotiation, Technical Inquiry"
              disabled={isSubmitting}
              className="w-full h-[46px] px-3.5 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
            />
          </div>

          {/* 6. Call Notes */}
          <div>
            <label htmlFor="call-notes-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Call Notes <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="call-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the conversation, customer requirements, or next steps..."
              disabled={isSubmitting}
              className="w-full p-3 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
            />
          </div>
        </form>

        {/* 3. Fixed Footer Actions */}
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
            disabled={isSubmitting}
            className="h-[46px] px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Creating Call...</span>
              </>
            ) : (
              <span>Create Call →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCallModal;
