/**
 * Audit log formatting and mapping utilities
 */

export const AUDIT_ACTION_CONFIG = {
  create: { label: 'Created', variant: 'green', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  update: { label: 'Updated', variant: 'blue', color: 'text-blue-700', bg: 'bg-blue-50' },
  delete: { label: 'Deleted', variant: 'red', color: 'text-rose-700', bg: 'bg-rose-50' },
  deactivate: { label: 'Deactivated', variant: 'red', color: 'text-rose-700', bg: 'bg-rose-50' },
  login: { label: 'Login', variant: 'indigo', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  logout: { label: 'Logout', variant: 'gray', color: 'text-slate-700', bg: 'bg-slate-50' },
  assign: { label: 'Assigned', variant: 'purple', color: 'text-purple-700', bg: 'bg-purple-50' },
  status_change: { label: 'Status Changed', variant: 'amber', color: 'text-amber-700', bg: 'bg-amber-50' },
  complete: { label: 'Completed', variant: 'green', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  mark_read: { label: 'Marked Read', variant: 'gray', color: 'text-slate-700', bg: 'bg-slate-50' },
  other: { label: 'Activity', variant: 'gray', color: 'text-slate-700', bg: 'bg-slate-50' },
};

export const AUDIT_ENTITY_CONFIG = {
  user: { label: 'User', variant: 'purple' },
  customer: { label: 'Customer', variant: 'indigo' },
  call: { label: 'Call', variant: 'blue' },
  call_outcome: { label: 'Call Outcome', variant: 'green' },
  follow_up: { label: 'Follow-up', variant: 'amber' },
  notification: { label: 'Notification', variant: 'gray' },
  system: { label: 'System', variant: 'gray' },
  other: { label: 'Entity', variant: 'gray' },
};

/**
 * Format audit action to display label
 * @param {string} action
 * @returns {string}
 */
export const formatAuditAction = (action) => {
  if (!action) return 'Activity';
  const key = String(action).toLowerCase();
  return AUDIT_ACTION_CONFIG[key]?.label || action.toUpperCase();
};

/**
 * Get badge variant for audit action
 * @param {string} action
 * @returns {string}
 */
export const getAuditActionVariant = (action) => {
  if (!action) return 'gray';
  const key = String(action).toLowerCase();
  return AUDIT_ACTION_CONFIG[key]?.variant || 'gray';
};

/**
 * Format entity type to display label
 * @param {string} entityType
 * @returns {string}
 */
export const formatAuditEntityType = (entityType) => {
  if (!entityType) return 'Entity';
  const key = String(entityType).toLowerCase();
  return AUDIT_ENTITY_CONFIG[key]?.label || entityType.toUpperCase();
};

/**
 * Get badge variant for entity type
 * @param {string} entityType
 * @returns {string}
 */
export const getAuditEntityVariant = (entityType) => {
  if (!entityType) return 'gray';
  const key = String(entityType).toLowerCase();
  return AUDIT_ENTITY_CONFIG[key]?.variant || 'gray';
};

/**
 * Format date to human-readable string
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatAuditDate = (dateInput) => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
};

/**
 * Format relative time (e.g. 'Just now', '5m ago', '2h ago')
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatAuditRelativeTime = (dateInput) => {
  if (!dateInput) return '—';
  try {
    const target = new Date(dateInput);
    if (isNaN(target.getTime())) return '—';

    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * Safe JSON parser for old/new value metadata
 * @param {string|Object} rawValue
 * @returns {string}
 */
export const formatAuditJson = (rawValue) => {
  if (!rawValue) return null;
  if (typeof rawValue === 'object') {
    return JSON.stringify(rawValue, null, 2);
  }
  try {
    const parsed = JSON.parse(rawValue);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(rawValue);
  }
};
