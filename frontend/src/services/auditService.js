import apiClient from './api';

export const auditService = {
  /**
   * Log an administrative override or critical action
   * @param {Object} logData
   * @param {string} logData.action - 'create' | 'update' | 'delete' | 'status_change' | etc.
   * @param {string} logData.entity_type - 'call' | 'customer' | 'call_outcome' | 'follow_up' | 'user'
   * @param {number} logData.entity_id
   * @param {string} logData.description
   * @param {string} [logData.old_values]
   * @param {string} [logData.new_values]
   * @param {number} [logData.user_id]
   * @returns {Promise<any>}
   */
  createAuditLog: async (logData) => {
    const response = await apiClient.post('/audit-logs', logData);
    return response.data;
  },

  /**
   * List audit logs
   * @param {Object} [params]
   * @returns {Promise<any>}
   */
  getAuditLogs: async (params = {}) => {
    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  },
};

export default auditService;
