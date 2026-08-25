/**
 * Notification utilities, type mappings, and relative time formatters
 */

export const NOTIFICATION_TYPE_CONFIG = {
  call_assigned: {
    label: 'Call Assigned',
    icon: '☎',
    variant: 'blue',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  follow_up_reminder: {
    label: 'Follow-up Due',
    icon: '⏰',
    variant: 'amber',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  call_outcome_recorded: {
    label: 'Outcome Recorded',
    icon: '✓',
    variant: 'green',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  system_alert: {
    label: 'System Alert',
    icon: '🔔',
    variant: 'purple',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  other: {
    label: 'Notification',
    icon: '📝',
    variant: 'gray',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

/**
 * Format notification type label
 * @param {string} type
 * @returns {string}
 */
export const formatNotificationType = (type) => {
  if (!type) return 'Notification';
  const key = String(type).toLowerCase();
  return NOTIFICATION_TYPE_CONFIG[key]?.label || type;
};

/**
 * Get notification badge variant
 * @param {string} type
 * @returns {string}
 */
export const getNotificationTypeVariant = (type) => {
  if (!type) return 'gray';
  const key = String(type).toLowerCase();
  return NOTIFICATION_TYPE_CONFIG[key]?.variant || 'gray';
};

/**
 * Get notification icon
 * @param {string} type
 * @returns {string}
 */
export const getNotificationIcon = (type) => {
  if (!type) return '🔔';
  const key = String(type).toLowerCase();
  return NOTIFICATION_TYPE_CONFIG[key]?.icon || '🔔';
};

/**
 * Get notification style config
 * @param {string} type
 * @returns {Object}
 */
export const getNotificationConfig = (type) => {
  const key = String(type || '').toLowerCase();
  return NOTIFICATION_TYPE_CONFIG[key] || NOTIFICATION_TYPE_CONFIG.other;
};

/**
 * Format human-readable relative time (e.g., 'Just now', '5m ago', '2h ago', 'Yesterday', 'May 12')
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '—';
  try {
    const target = new Date(dateInput);
    if (isNaN(target.getTime())) return '—';

    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 45) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '—';
  }
};

/**
 * Get formatted label for reference entity
 * @param {string} referenceType
 * @param {number|string} referenceId
 * @returns {string|null}
 */
export const formatReferenceLabel = (referenceType, referenceId) => {
  if (!referenceType || !referenceId) return null;
  const typeKey = String(referenceType).toLowerCase();
  switch (typeKey) {
    case 'call':
      return `Call #${referenceId}`;
    case 'follow_up':
      return `Follow-up #${referenceId}`;
    case 'customer':
      return `Customer #${referenceId}`;
    case 'outcome':
      return `Outcome Ref #${referenceId}`;
    case 'system':
      return `System Ref #${referenceId}`;
    default:
      return `${referenceType} #${referenceId}`;
  }
};

/**
 * Get routing destination path for reference entity
 * @param {string} referenceType
 * @returns {string|null}
 */
export const getReferencePath = (referenceType) => {
  if (!referenceType) return null;
  const typeKey = String(referenceType).toLowerCase();
  switch (typeKey) {
    case 'call':
      return '/calls';
    case 'follow_up':
      return '/follow-ups';
    case 'customer':
      return '/customers';
    default:
      return null;
  }
};
