/**
 * Report utilities, type labels, formatting helpers, and CSV filename generators
 */

/**
 * Format duration in seconds to human readable string (e.g., '45s', '3m 12s', '1h 15m')
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export const formatReportDuration = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '0s';
  }
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Format date string into readable report timestamp
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatReportDate = (dateInput) => {
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
    });
  } catch {
    return '—';
  }
};

/**
 * Format number with comma separators
 * @param {number|null|undefined} num
 * @returns {string}
 */
export const formatReportNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US');
};

/**
 * Format percentage with precision
 * @param {number} value
 * @param {number} total
 * @param {number} [decimals=1]
 * @returns {string}
 */
export const formatReportPercentage = (value, total, decimals = 1) => {
  if (!total || total <= 0 || isNaN(value) || value <= 0) return '0%';
  const pct = (value / total) * 100;
  return `${pct.toFixed(decimals)}%`;
};

/**
 * Standard Status Labels
 */
export const CALL_STATUS_LABELS = {
  initiated: 'Initiated',
  ringing: 'Ringing',
  ongoing: 'Ongoing',
  completed: 'Completed',
  missed: 'Missed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Direction Labels
 */
export const DIRECTION_LABELS = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
};

/**
 * Outcome Labels
 */
export const OUTCOME_LABELS = {
  interested: 'Interested',
  converted: 'Converted',
  follow_up_required: 'Follow-up Required',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  no_response: 'No Response',
  pending: 'Pending',
};

/**
 * Follow-up Type Labels
 */
export const FOLLOW_UP_TYPE_LABELS = {
  callback: 'Callback',
  email: 'Email',
  demo: 'Demo',
  meeting: 'Meeting',
  whatsapp: 'WhatsApp',
  other: 'Other',
};
