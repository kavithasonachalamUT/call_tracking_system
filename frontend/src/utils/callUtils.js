/**
 * Call utility functions and display formatters for the Call Tracking System
 */

export const DIRECTION_CONFIG = {
  incoming: {
    label: 'Incoming',
    icon: '↙',
    variant: 'indigo',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  outgoing: {
    label: 'Outgoing',
    icon: '↗',
    variant: 'blue',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
};

export const PLATFORM_CONFIG = {
  phone: {
    label: 'Phone Call',
    icon: '☎',
    variant: 'purple',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    variant: 'green',
  },
  google_meet: {
    label: 'Google Meet',
    icon: '💻',
    variant: 'blue',
  },
  microsoft_teams: {
    label: 'Microsoft Teams',
    icon: '👥',
    variant: 'indigo',
  },
  teams: {
    label: 'Teams',
    icon: '👥',
    variant: 'indigo',
  },
  zoom: {
    label: 'Zoom',
    icon: '📹',
    variant: 'blue',
  },
  other: {
    label: 'Other Platform',
    icon: '📝',
    variant: 'gray',
  },
};

export const STATUS_CONFIG = {
  initiated: {
    label: 'Initiated',
    variant: 'amber',
    badgeVariant: 'amber',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    isActive: true,
  },
  ringing: {
    label: 'Ringing',
    variant: 'blue',
    badgeVariant: 'blue',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    isActive: true,
  },
  ongoing: {
    label: 'Ongoing',
    variant: 'purple',
    badgeVariant: 'purple',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    isActive: true,
  },
  completed: {
    label: 'Completed',
    variant: 'green',
    badgeVariant: 'green',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    isActive: false,
  },
  missed: {
    label: 'Missed',
    variant: 'rose',
    badgeVariant: 'rose',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    isActive: false,
  },
  failed: {
    label: 'Failed',
    variant: 'red',
    badgeVariant: 'red',
    color: 'text-red-700',
    bg: 'bg-red-50',
    isActive: false,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'gray',
    badgeVariant: 'gray',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    isActive: false,
  },
};

/**
 * Format call direction
 * @param {string} direction
 * @returns {string}
 */
export const formatCallDirection = (direction) => {
  if (!direction) return '—';
  const key = String(direction).toLowerCase();
  return DIRECTION_CONFIG[key]?.label || direction;
};

/**
 * Get call direction badge variant
 * @param {string} direction
 * @returns {string}
 */
export const getDirectionVariant = (direction) => {
  if (!direction) return 'gray';
  const key = String(direction).toLowerCase();
  return DIRECTION_CONFIG[key]?.variant || 'gray';
};

/**
 * Format platform name
 * @param {string} platform
 * @returns {string}
 */
export const formatPlatformName = (platform) => {
  if (!platform) return 'Phone';
  const key = String(platform).toLowerCase();
  return PLATFORM_CONFIG[key]?.label || platform;
};

/**
 * Get platform badge variant
 * @param {string} platform
 * @returns {string}
 */
export const getPlatformVariant = (platform) => {
  if (!platform) return 'gray';
  const key = String(platform).toLowerCase();
  return PLATFORM_CONFIG[key]?.variant || 'gray';
};

/**
 * Format call status
 * @param {string} status
 * @returns {string}
 */
export const formatCallStatus = (status) => {
  if (!status) return '—';
  const key = String(status).toLowerCase();
  return STATUS_CONFIG[key]?.label || status;
};

/**
 * Get status badge variant
 * @param {string} status
 * @returns {string}
 */
export const getCallStatusVariant = (status) => {
  if (!status) return 'gray';
  const key = String(status).toLowerCase();
  return STATUS_CONFIG[key]?.variant || 'gray';
};

/**
 * Check if a call status is currently live/active
 * @param {string} status
 * @returns {boolean}
 */
export const isCallActive = (status) => {
  if (!status) return false;
  const key = String(status).toLowerCase();
  return Boolean(STATUS_CONFIG[key]?.isActive);
};

/**
 * Format call duration in seconds to MM:SS or HH:MM:SS
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format human-readable date & time
 * @param {string|Date|null|undefined} dateInput
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
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};
