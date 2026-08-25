/**
 * Analytics formatting and transformation utilities
 */

/**
 * Format seconds into human readable duration (e.g., '45s', '3m 12s', '1h 15m 20s')
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export const formatDuration = (seconds) => {
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
 * Format percentage with optional decimal precision
 * @param {number} value
 * @param {number} total
 * @param {number} [decimals=1]
 * @returns {string}
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (!total || total <= 0 || isNaN(value) || value <= 0) {
    return '0%';
  }
  const pct = (value / total) * 100;
  return `${pct.toFixed(decimals)}%`;
};

/**
 * Format standard integer with comma separators
 * @param {number|null|undefined} num
 * @returns {string}
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return Number(num).toLocaleString('en-US');
};

/**
 * Calculate conversion rate from outcomes breakdown
 * @param {Record<string, number>} outcomeBreakdown
 * @param {number} totalOutcomes
 * @returns {{ count: number, rate: string }}
 */
export const calculateConversionMetrics = (outcomeBreakdown = {}, totalOutcomes = 0) => {
  const convertedCount =
    (outcomeBreakdown.converted || 0) +
    (outcomeBreakdown.interested || 0) +
    (outcomeBreakdown.completed || 0);

  const rate = totalOutcomes > 0 ? formatPercentage(convertedCount, totalOutcomes) : '0%';

  return {
    count: convertedCount,
    rate,
  };
};

/**
 * Map status keys to human friendly display labels
 */
export const STATUS_LABELS = {
  initiated: 'Initiated',
  ringing: 'Ringing',
  ongoing: 'Ongoing',
  completed: 'Completed',
  missed: 'Missed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Map outcome keys to human friendly display labels
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
