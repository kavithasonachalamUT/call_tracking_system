/**
 * Format duration in seconds into a human-readable string.
 * @param {number|null|undefined} seconds
 * @returns {string} e.g. "45s", "2m 15s", "1h 1m 5s", or "0s"
 */
export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '0s';
  }

  const totalSeconds = Math.round(Number(seconds));
  if (totalSeconds === 0) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
};

/**
 * Format ISO datetime string into readable local date and time.
 * @param {string|null|undefined} dateStr
 * @returns {string} e.g. "Aug 24, 2026, 02:45 PM"
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '--';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '--';
  }
};

/**
 * Format ISO date string into readable local date.
 * @param {string|null|undefined} dateStr
 * @returns {string} e.g. "Aug 24, 2026"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '--';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return '--';
  }
};

/**
 * Format phone number cleanly.
 * @param {string|null|undefined} phone
 * @returns {string}
 */
export const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '--';
  return phone.trim();
};

/**
 * Map backend call, follow-up, and outcome statuses to Badge color variants.
 * @param {string|null|undefined} status
 * @returns {"green" | "blue" | "amber" | "red" | "purple" | "gray"}
 */
export const getStatusVariant = (status) => {
  if (!status || typeof status !== 'string') return 'gray';

  const normalized = status.toLowerCase().trim();

  switch (normalized) {
    // Success / Completed states
    case 'completed':
    case 'converted':
    case 'resolved':
    case 'interested':
    case 'active':
      return 'green';

    // Active / Ongoing / Scheduled states
    case 'ongoing':
    case 'in_progress':
    case 'demo_scheduled':
    case 'scheduled':
      return 'blue';

    // Warning / Pending / In-flight states
    case 'initiated':
    case 'ringing':
    case 'pending':
    case 'follow_up_required':
    case 'callback_requested':
      return 'amber';

    // Danger / Failure / Cancellation states
    case 'failed':
    case 'missed':
    case 'cancelled':
    case 'not_interested':
    case 'complaint':
    case 'overdue':
    case 'inactive':
      return 'red';

    // Special / Categorical states
    case 'callback':
    case 'meeting':
    case 'demo':
    case 'admin':
      return 'purple';

    default:
      return 'gray';
  }
};

/**
 * Format customer name with fallback.
 * @param {string|null|undefined} name
 * @returns {string}
 */
export const formatCustomerName = (name) => {
  if (!name || typeof name !== 'string' || !name.trim()) return 'Unnamed Customer';
  return name.trim();
};

/**
 * Format customer active status into label and badge variant.
 * @param {boolean|null|undefined} isActive
 * @returns {{ label: string, variant: "green" | "gray" }}
 */
export const formatCustomerStatus = (isActive) => {
  return isActive
    ? { label: 'Active', variant: 'green' }
    : { label: 'Inactive', variant: 'gray' };
};
