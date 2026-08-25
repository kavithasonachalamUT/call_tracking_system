import { useState, useEffect, useRef } from 'react';

const CustomerFormModalInner = ({
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
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setServerError(err.message || 'An error occurred while saving customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 id="customer-modal-title" className="text-lg font-bold tracking-tight">
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEditing ? 'Update customer profile information and contact details' : 'Register a new customer for call tracking and CRM'}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-130px)] overflow-y-auto">
          {serverError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          {/* Name & Phone Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="customer-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. John Doe"
                disabled={isSubmitting}
                className={`w-full h-10 px-3.5 bg-slate-50 border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.name
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="customer-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="customer-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. +1 555 123 4567"
                disabled={isSubmitting}
                className={`w-full h-10 px-3.5 bg-slate-50 border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.phone
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Email & Company Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="customer-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. john@example.com"
                disabled={isSubmitting}
                className={`w-full h-10 px-3.5 bg-slate-50 border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.email
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="customer-company" className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Organization
              </label>
              <input
                id="customer-company"
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="e.g. Acme Corp"
                disabled={isSubmitting}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Address Field */}
          <div>
            <label htmlFor="customer-address" className="block text-xs font-semibold text-slate-700 mb-1">
              Address / Location
            </label>
            <input
              id="customer-address"
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. 123 Main St, Suite 400, New York, NY"
              disabled={isSubmitting}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Notes Field */}
          <div>
            <label htmlFor="customer-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notes & Preferences
            </label>
            <textarea
              id="customer-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional background, preferred contact hours, customer tier..."
              disabled={isSubmitting}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
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

export const CustomerFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isEditing = false,
  initialData = null,
}) => {
  if (!isOpen) return null;

  return (
    <CustomerFormModalInner
      key={initialData?.id || 'new'}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isEditing={isEditing}
      initialData={initialData}
    />
  );
};

export default CustomerFormModal;
