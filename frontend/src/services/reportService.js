import apiClient from './api';

/**
 * Helper to trigger browser download for a Blob CSV payload
 * @param {Blob|string} blobData
 * @param {string} defaultFilename
 * @param {string} [dispositionHeader]
 */
export const downloadBlob = (blobData, defaultFilename = 'report.csv', dispositionHeader = null) => {
  let filename = defaultFilename;
  if (dispositionHeader) {
    const filenameMatch = dispositionHeader.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }
  const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportService = {
  /**
   * Summary reporting totals
   * @param {Object} [params]
   * @param {string} [params.start_date]
   * @param {string} [params.end_date]
   * @returns {Promise<{
   *   total_calls: number,
   *   total_customers: number,
   *   total_outcomes: number,
   *   total_follow_ups: number,
   *   total_duration_seconds: number,
   *   start_date?: string,
   *   end_date?: string
   * }>}
   */
  getReportSummary: async (params = {}) => {
    const response = await apiClient.get('/reports/summary', { params });
    return response.data;
  },

  /**
   * Calls Report data
   */
  getCallReport: async (params = {}) => {
    const response = await apiClient.get('/reports/calls', { params });
    return response.data;
  },

  /**
   * Export Calls Report to CSV
   */
  exportCallReport: async (params = {}) => {
    const response = await apiClient.get('/reports/calls/export', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      'call_report.csv',
      response.headers['content-disposition']
    );
    return true;
  },

  /**
   * Customers Report data
   */
  getCustomerReport: async (params = {}) => {
    const response = await apiClient.get('/reports/customers', { params });
    return response.data;
  },

  /**
   * Export Customers Report to CSV
   */
  exportCustomerReport: async (params = {}) => {
    const response = await apiClient.get('/reports/customers/export', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      'customer_report.csv',
      response.headers['content-disposition']
    );
    return true;
  },

  /**
   * Outcomes Report data
   */
  getOutcomeReport: async (params = {}) => {
    const response = await apiClient.get('/reports/outcomes', { params });
    return response.data;
  },

  /**
   * Export Outcomes Report to CSV
   */
  exportOutcomeReport: async (params = {}) => {
    const response = await apiClient.get('/reports/outcomes/export', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      'outcome_report.csv',
      response.headers['content-disposition']
    );
    return true;
  },

  /**
   * Follow-ups Report data
   */
  getFollowUpReport: async (params = {}) => {
    const response = await apiClient.get('/reports/follow-ups', { params });
    return response.data;
  },

  /**
   * Export Follow-ups Report to CSV
   */
  exportFollowUpReport: async (params = {}) => {
    const response = await apiClient.get('/reports/follow-ups/export', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      'follow_up_report.csv',
      response.headers['content-disposition']
    );
    return true;
  },

  /**
   * Agent Performance Report data
   */
  getAgentPerformanceReport: async (params = {}) => {
    const response = await apiClient.get('/reports/agents', { params });
    return response.data;
  },

  /**
   * Export Agent Performance Report to CSV
   */
  exportAgentPerformanceReport: async (params = {}) => {
    const response = await apiClient.get('/reports/agents/export', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      'agent_performance_report.csv',
      response.headers['content-disposition']
    );
    return true;
  },

  /**
   * Audit Logs Report data
   */
  getAuditReport: async (params = {}) => {
    const response = await apiClient.get('/reports/audit-logs', { params });
    return response.data;
  },

  /**
   * Export Audit Logs Report to CSV
   */
  exportAuditReport: async (params = {}) => {
    const response = await apiClient.get('/reports/audit-logs/export', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      'audit_history_report.csv',
      response.headers['content-disposition']
    );
    return true;
  },
};

export default reportService;
