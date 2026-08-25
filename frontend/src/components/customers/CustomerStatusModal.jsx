import Modal from '../ui/Modal';
import Button from '../ui/Button';

export const CustomerStatusModal = ({
  isOpen,
  onClose,
  customer,
  onConfirmToggle,
  isProcessing = false,
}) => {
  if (!customer || !isOpen) return null;

  const isDeactivating = customer.is_active !== false;
  const actionText = isDeactivating ? 'Deactivate Customer' : 'Activate Customer';
  const processingText = isDeactivating ? 'Deactivating...' : 'Activating...';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title={isDeactivating ? 'Deactivate Customer Profile' : 'Activate Customer Profile'}
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={isDeactivating ? 'danger' : 'primary'}
            size="sm"
            onClick={() => onConfirmToggle(customer.id, !isDeactivating)}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            {isProcessing ? processingText : actionText}
          </Button>
        </>
      }
    >
      <div className="text-left text-sm text-slate-600 space-y-2">
        <p>
          {isDeactivating ? (
            <>
              Are you sure you want to deactivate <strong className="font-semibold text-slate-900">{customer.name}</strong>?
            </>
          ) : (
            <>
              Are you sure you want to activate <strong className="font-semibold text-slate-900">{customer.name}</strong>?
            </>
          )}
        </p>
        <p className="text-xs text-slate-500">
          {isDeactivating
            ? 'This will soft-deactivate the customer profile. Existing call logs, recordings, and follow-up histories will be preserved.'
            : 'This will restore the customer profile to active status and make them available for direct call logging.'}
        </p>
      </div>
    </Modal>
  );
};

export default CustomerStatusModal;
