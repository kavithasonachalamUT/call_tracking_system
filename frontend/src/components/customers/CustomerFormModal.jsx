import { useState, useEffect, useRef } from 'react';

export const CustomerFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isEditing = false,
  initialData = null,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    company: initialData?.company || '',
    address: initialData?.address || '',
    notes: initialData?.notes || '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef(null);
  const prevDataIdRef = useRef(null);

  // Sync state if customer changes when editing
  if (isOpen && isEditing && initialData && initialData.id !== prevDataIdRef.current) {
    prevDataIdRef.current = initialData.id;
    setFormData({
      name: initialData.name || '',
      phone: initialData.phone || '',
      email: initialData.email || '',
      company: initialData.company || '',
      address: initialData.address || '',
      notes: initialData.notes || '',
    });
    setFieldErrors({});
    setServerError('');
  } else if (isOpen && !isEditing && prevDataIdRef.current !== 'new') {
    prevDataIdRef.current = 'new';
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      address: '',
      notes: '',
    });
    setFieldErrors({});
    setServerError('');
  } else if (!isOpen && prevDataIdRef.current !== null) {
    prevDataIdRef.current = null;
  }

  // Handle Escape key
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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validateForm = () => {
    const errors = {};
    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      errors.name = 'Customer name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Customer name must be at least 2 characters';
    }

    if (!trimmedPhone) {
      errors.phone = 'Phone number is required';
    } else if (trimmedPhone.length < 7) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (trimmedEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address';
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
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        company: formData.company.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setServerError(
        err.message || 'Unable to save customer profile. Please check the details and try again.'
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
      aria-labelledby="customer-form-title"
    >
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Centered Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]"
      >
        {/* 1. Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div>
              <h2 id="customer-form-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Customer Profile' : 'Add New Customer'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? 'Update customer details and contact preferences.'
                  : 'Create a customer profile to start tracking calls and follow-ups.'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-left" noValidate>
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

          {/* Section 1: Customer Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Customer Information
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Basic details about the customer or primary contact.
              </p>
            </div>

            <div>
              <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="customer-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Acme Corporation or John Smith"
                  disabled={isSubmitting}
                  className={`w-full h-[50px] pl-10 pr-4 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border transition-all focus:outline-none focus:ring-2 ${
                    fieldErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="customer-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  id="customer-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +1 999 756 3457"
                  disabled={isSubmitting}
                  className={`w-full h-[50px] pl-10 pr-4 bg-white rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 border transition-all focus:outline-none focus:ring-2 ${
                    fieldErrors.phone
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20'
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{fieldErrors.phone}</span>
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 2: Contact & Company */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Contact & Company
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Corporate affiliation and email correspondence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="customer-email" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="customer-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. contact@acme.com"
                    disabled={isSubmitting}
                    className={`w-full h-[50px] pl-10 pr-4 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="customer-company" className="text-xs font-semibold text-slate-700">
                    Company Name
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <input
                    id="customer-company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="e.g. Acme Global Inc."
                    disabled={isSubmitting}
                    className="w-full h-[50px] pl-10 pr-4 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 3: Address */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Address
                </h3>
                <span className="text-[11px] text-slate-400 font-normal">Optional</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer location and billing / contact address.
              </p>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  id="customer-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="e.g. 100 Enterprise Way, Suite 400"
                  disabled={isSubmitting}
                  className="w-full h-[50px] pl-10 pr-4 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 4: Additional Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Additional Information
              </h3>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </div>

            <div>
              <label htmlFor="customer-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Client Notes / Account Background
              </label>
              <textarea
                id="customer-notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add key account context, preferred call windows, or interaction summaries..."
                disabled={isSubmitting}
                className="w-full p-3 bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all focus:outline-none"
              />
            </div>
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
                <span>{isEditing ? 'Saving Changes...' : 'Creating Customer...'}</span>
              </>
            ) : (
              <span>{isEditing ? 'Save Changes' : 'Create Customer'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerFormModal;
