import apiClient from './api';

export const notificationService = {
  /**
   * List current user's notifications
   * @param {Object} [params]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=50]
   * @param {boolean} [params.is_read]
   * @param {string} [params.notification_type] - 'call_assigned' | 'follow_up_reminder' | 'call_outcome_recorded' | 'system_alert' | 'other'
   * @returns {Promise<Array<any>>}
   */
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  /**
   * Get unread & total notification count for current user
   * @returns {Promise<{ unread_count: number, total_count: number }>}
   */
  getNotificationSummary: async () => {
    const response = await apiClient.get('/notifications/summary');
    return response.data;
  },

  /**
   * Get single notification by ID
   * @param {number} notificationId
   * @returns {Promise<any>}
   */
  getNotification: async (notificationId) => {
    const response = await apiClient.get(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Mark a single notification as read
   * @param {number} notificationId
   * @returns {Promise<any>}
   */
  markNotificationAsRead: async (notificationId) => {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all current user's notifications as read
   * @returns {Promise<{ unread_count: number, total_count: number }>}
   */
  markAllNotificationsAsRead: async () => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },

  /**
   * Soft delete notification by ID
   * @param {number} notificationId
   * @returns {Promise<any>}
   */
  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Create a notification (Admin only)
   * @param {Object} data
   * @param {number} data.user_id
   * @param {string} data.notification_type
   * @param {string} data.title
   * @param {string} data.message
   * @param {string} [data.reference_type]
   * @param {number} [data.reference_id]
   * @returns {Promise<any>}
   */
  createNotification: async (data) => {
    const response = await apiClient.post('/notifications', data);
    return response.data;
  },
};

export default notificationService;
