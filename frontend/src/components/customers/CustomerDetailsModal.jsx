import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatDateTime, formatPhoneNumber, formatCustomerName, formatCustomerStatus } from '../../utils/formatters';

export const CustomerDetailsModal = ({
  isOpen,
  onClose,
  customer,
  onEdit,
}) => {
  if (!customer || !isOpen) return null;

  const statusInfo = formatCustomerStatus(customer.is_active);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Profile Details"
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
          {onEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(customer);
              }}
            >
              Edit Profile
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-left text-xs">
        {/* Header Profile Pill */}
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            {customer.name ? customer.name.slice(0, 2).toUpperCase() : 'CU'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{formatCustomerName(customer.name)}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={statusInfo.variant} size="sm">
                {statusInfo.label} Customer
              </Badge>
              <span className="text-slate-400 font-mono text-[11px]">• ID: #{customer.id}</span>
            </div>
          </div>
        </div>

        {/* Grid Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Phone Number</span>
            <span className="font-mono text-sm font-semibold text-slate-900 mt-0.5 block">
              {formatPhoneNumber(customer.phone)}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Email Address</span>
            <span className="text-sm font-medium text-slate-900 mt-0.5 block truncate">
              {customer.email || '—'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Company</span>
            <span className="text-sm font-medium text-slate-900 mt-0.5 block">
              {customer.company || '—'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Registered Date</span>
            <span className="text-xs font-medium text-slate-700 mt-0.5 block">
              {formatDateTime(customer.created_at)}
            </span>
          </div>
        </div>

        {/* Address */}
        {customer.address && (
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Office Address</span>
            <span className="text-xs text-slate-800 mt-0.5 block">{customer.address}</span>
          </div>
        )}

        {/* Notes */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
            Customer Notes
          </span>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
            {customer.notes || 'No notes have been logged for this customer.'}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerDetailsModal;
