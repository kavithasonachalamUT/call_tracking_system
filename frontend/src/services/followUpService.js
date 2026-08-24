import apiClient from './api';

export const followUpService = {
  /**
   * List follow-ups with optional filters, search, and pagination
   * @param {Object} [params]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=50]
   * @param {number} [params.call_id]
   * @param {number} [params.customer_id]
   * @param {number} [params.assigned_to]
   * @param {string} [params.follow_up_type] - 'callback' | 'email' | 'demo' | 'meeting' | 'whatsapp' | 'other'
   * @param {string} [params.status] - 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
   * @param {string} [params.search]
   * @returns {Promise<Array<any>>}
   */
  getFollowUps: async (params = {}) => {
    const response = await apiClient.get('/follow-ups', { params });
    return response.data;
  },

  /**
   * Get single follow-up by ID
   * @param {number} followUpId
   * @returns {Promise<any>}
   */
  getFollowUp: async (followUpId) => {
    const response = await apiClient.get(`/follow-ups/${followUpId}`);
    return response.data;
  },

  /**
   * Get follow-ups associated with a specific call ID
   * @param {number} callId
   * @returns {Promise<Array<any>>}
   */
  getFollowUpsByCallId: async (callId) => {
    const response = await apiClient.get(`/calls/${callId}/follow-ups`);
    return response.data;
  },

  /**
   * Create a new follow-up
   * @param {Object} data
   * @param {number} data.call_id
   * @param {number} data.customer_id
   * @param {number} data.assigned_to
   * @param {string} data.follow_up_type
   * @param {string} [data.status='pending']
   * @param {string} data.scheduled_at - ISO 8601 string
   * @param {string} [data.completed_at]
   * @param {string} [data.notes]
   * @returns {Promise<any>}
   */
  createFollowUp: async (data) => {
    const response = await apiClient.post('/follow-ups', data);
    return response.data;
  },

  /**
   * Update a follow-up by ID
   * @param {number} followUpId
   * @param {Object} data
   * @returns {Promise<any>}
   */
  updateFollowUp: async (followUpId, data) => {
    const response = await apiClient.put(`/follow-ups/${followUpId}`, data);
    return response.data;
  },

  /**
   * Mark follow-up as completed
   * @param {number} followUpId
   * @param {string} [completedAt]
   * @returns {Promise<any>}
   */
  completeFollowUp: async (followUpId, completedAt = new Date().toISOString()) => {
    const response = await apiClient.put(`/follow-ups/${followUpId}`, {
      status: 'completed',
      completed_at: completedAt,
    });
    return response.data;
  },

  /**
   * Soft delete / cancel a follow-up
   * @param {number} followUpId
   * @returns {Promise<any>}
   */
  deleteFollowUp: async (followUpId) => {
    const response = await apiClient.delete(`/follow-ups/${followUpId}`);
    return response.data;
  },
};

export default followUpService;
