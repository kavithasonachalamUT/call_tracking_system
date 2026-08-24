import Modal from '../ui/Modal';
import Button from '../ui/Button';

export const DeleteCustomerModal = ({
  isOpen,
  onClose,
  customer,
  onConfirmDeactivate,
  isDeactivating = false,
}) => {
  if (!customer || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isDeactivating && onClose()}
      title="Deactivate Customer Profile"
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeactivating}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onConfirmDeactivate(customer.id)}
            isLoading={isDeactivating}
            disabled={isDeactivating}
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate Customer'}
          </Button>
        </>
      }
    >
      <div className="text-left text-sm text-slate-600 space-y-2">
        <p>
          Are you sure you want to deactivate <strong className="font-semibold text-slate-900">{customer.name}</strong>?
        </p>
        <p className="text-xs text-slate-500">
          This will soft-deactivate the customer profile. Existing call logs, recordings, and follow-up histories will be preserved.
        </p>
      </div>
    </Modal>
  );
};

export default DeleteCustomerModal;
