import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatDateTime } from '../../utils/formatters';

const TYPE_CONFIG = {
  call_assigned: { label: 'Call Assigned', variant: 'blue' },
  follow_up_reminder: { label: 'Follow-up Reminder', variant: 'amber' },
  call_outcome_recorded: { label: 'Outcome Recorded', variant: 'green' },
  system_alert: { label: 'System Alert', variant: 'rose' },
  other: { label: 'Other', variant: 'gray' },
};

export const NotificationDetailsModal = ({
  isOpen,
  onClose,
  notification,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();

  if (!notification || !isOpen) return null;

  const typeConfig = TYPE_CONFIG[notification.notification_type] || {
    label: notification.notification_type,
    variant: 'gray',
  };

  const handleNavigateReference = () => {
    onClose();
    if (notification.reference_type === 'call') {
      navigate('/calls');
    } else if (notification.reference_type === 'follow_up') {
      navigate('/follow-ups');
    } else if (notification.reference_type === 'customer') {
      navigate('/customers');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Details"
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>

          {!notification.is_read && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
            >
              Mark as Read
            </Button>
          )}

          {notification.reference_type && ['call', 'follow_up', 'customer'].includes(notification.reference_type) && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNavigateReference}
            >
              Open {notification.reference_type === 'call' ? 'Calls' : notification.reference_type === 'follow_up' ? 'Follow-ups' : 'Customers'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-left text-xs">
        {/* Status Header */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <Badge variant={typeConfig.variant} size="md">
            {typeConfig.label}
          </Badge>

          <span className="text-slate-400 font-mono text-[11px]">
            {formatDateTime(notification.created_at)}
          </span>
        </div>

        {/* Title */}
        <div>
          <span className="text-slate-400 font-medium block">Title</span>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">{notification.title}</h3>
        </div>

        {/* Message */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
            Message
          </span>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* References and Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium block">Status</span>
            <div className="mt-1">
              <Badge variant={notification.is_read ? 'green' : 'indigo'} size="sm">
                {notification.is_read ? 'Read' : 'Unread'}
              </Badge>
            </div>
            {notification.read_at && (
              <span className="text-[10px] text-slate-400 block mt-1">
                Read: {formatDateTime(notification.read_at)}
              </span>
            )}
          </div>

          {notification.reference_type && (
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-400 font-medium block">Reference</span>
              <span className="text-xs font-semibold text-indigo-700 mt-1 capitalize block">
                {notification.reference_type} {notification.reference_id ? `#${notification.reference_id}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationDetailsModal;
