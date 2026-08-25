import apiClient from './api';

export const auditLogService = {
  /**
   * List audit logs with optional filters, search, and pagination
   * @param {Object} [params]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=20]
   * @param {string} [params.action]
   * @param {string} [params.entity_type]
   * @param {number} [params.entity_id]
   * @param {number} [params.user_id]
   * @param {string} [params.search]
   * @returns {Promise<Array<{
   *   id: number,
   *   user_id?: number,
   *   user_name?: string,
   *   user_email?: string,
   *   action: string,
   *   entity_type: string,
   *   entity_id?: number,
   *   description?: string,
   *   old_values?: string,
   *   new_values?: string,
   *   ip_address?: string,
   *   created_at: string
   * }>>}
   */
  getAuditLogs: async (params = {}) => {
    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  },

  /**
   * Get single audit log entry by ID
   * @param {number} auditLogId
   * @returns {Promise<any>}
   */
  getAuditLog: async (auditLogId) => {
    const response = await apiClient.get(`/audit-logs/${auditLogId}`);
    return response.data;
  },

  /**
   * Get audit trail for a specific call
   * @param {number} callId
   * @returns {Promise<Array<any>>}
   */
  getCallAuditTrail: async (callId) => {
    const response = await apiClient.get('/audit-logs', {
      params: {
        entity_type: 'call',
        entity_id: callId,
        limit: 100,
      },
    });
    return response.data;
  },
};

export default auditLogService;
