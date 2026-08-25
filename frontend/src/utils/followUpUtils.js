/**
 * Follow-up utilities, formatters, and timing helpers
 */

export const FOLLOW_UP_TYPE_CONFIG = {
  callback: {
    label: 'Callback',
    icon: '☎',
    variant: 'blue',
  },
  email: {
    label: 'Email',
    icon: '✉',
    variant: 'indigo',
  },
  demo: {
    label: 'Product Demo',
    icon: '💻',
    variant: 'purple',
  },
  meeting: {
    label: 'Meeting',
    icon: '👥',
    variant: 'amber',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    variant: 'green',
  },
  other: {
    label: 'Other',
    icon: '📝',
    variant: 'gray',
  },
};

export const FOLLOW_UP_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'amber',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'purple',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
  },
  completed: {
    label: 'Completed',
    variant: 'green',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'gray',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
  },
  overdue: {
    label: 'Overdue',
    variant: 'rose',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
  },
};

/**
 * Format follow-up type
 * @param {string} type
 * @returns {string}
 */
export const formatFollowUpType = (type) => {
  if (!type) return 'Follow-up';
  const key = String(type).toLowerCase();
  return FOLLOW_UP_TYPE_CONFIG[key]?.label || type;
};

/**
 * Get follow-up type badge variant
 * @param {string} type
 * @returns {string}
 */
export const getFollowUpTypeVariant = (type) => {
  if (!type) return 'gray';
  const key = String(type).toLowerCase();
  return FOLLOW_UP_TYPE_CONFIG[key]?.variant || 'gray';
};

/**
 * Format follow-up status label
 * @param {string} status
 * @param {string|Date} [scheduledAt]
 * @returns {string}
 */
export const formatFollowUpStatus = (status, scheduledAt) => {
  if (!status) return '—';
  const key = String(status).toLowerCase();
  if (key === 'pending' && scheduledAt && isFollowUpOverdue(scheduledAt, status)) {
    return 'Overdue';
  }
  return FOLLOW_UP_STATUS_CONFIG[key]?.label || status;
};

/**
 * Get follow-up status badge variant
 * @param {string} status
 * @param {string|Date} [scheduledAt]
 * @returns {string}
 */
export const getFollowUpStatusVariant = (status, scheduledAt) => {
  if (!status) return 'gray';
  const key = String(status).toLowerCase();
  if ((key === 'pending' || key === 'in_progress') && scheduledAt && isFollowUpOverdue(scheduledAt, status)) {
    return 'rose';
  }
  return FOLLOW_UP_STATUS_CONFIG[key]?.variant || 'gray';
};

/**
 * Check if a follow-up is overdue
 * @param {string|Date} scheduledAt
 * @param {string} [status='pending']
 * @returns {boolean}
 */
export const isFollowUpOverdue = (scheduledAt, status = 'pending') => {
  if (!scheduledAt) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  try {
    const dueTime = new Date(scheduledAt).getTime();
    return dueTime < Date.now();
  } catch {
    return false;
  }
};

/**
 * Check if a follow-up is scheduled for today
 * @param {string|Date} scheduledAt
 * @returns {boolean}
 */
export const isFollowUpDueToday = (scheduledAt) => {
  if (!scheduledAt) return false;
  try {
    const d = new Date(scheduledAt);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
};

/**
 * Format human-readable relative due timing
 * @param {string|Date} scheduledAt
 * @param {string} [status]
 * @returns {string}
 */
export const formatRelativeDueTime = (scheduledAt, status) => {
  if (!scheduledAt) return '—';
  try {
    const target = new Date(scheduledAt);
    if (isNaN(target.getTime())) return '—';

    const now = new Date();
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';

    const timeStr = target.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isCompleted || isCancelled) {
      return `${target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const diffDays = Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      if (target.getTime() < now.getTime()) {
        const diffMinutes = Math.floor((now.getTime() - target.getTime()) / (1000 * 60));
        if (diffMinutes < 60) {
          return `Overdue by ${diffMinutes}m (${timeStr})`;
        }
        const diffHours = Math.floor(diffMinutes / 60);
        return `Overdue by ${diffHours}h (${timeStr})`;
      }
      return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow, ${timeStr}`;
    } else if (diffDays === -1) {
      return `Yesterday, ${timeStr} (Overdue)`;
    } else if (diffDays < -1) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays <= 7) {
      const weekday = target.toLocaleDateString('en-US', { weekday: 'short' });
      return `${weekday}, ${timeStr}`;
    }

    return `${target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
  } catch {
    return '—';
  }
};

/**
 * Format absolute date & time
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};
