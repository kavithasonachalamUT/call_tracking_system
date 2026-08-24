import apiClient from './api';

export const callService = {
  /**
   * List calls with optional filters, search, and pagination
   * @param {Object} [params]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=50]
   * @param {string} [params.direction] - 'incoming' | 'outgoing'
   * @param {string} [params.platform] - 'phone' | 'whatsapp' | 'google_meet' | 'microsoft_teams' | 'zoom' | 'other'
   * @param {string} [params.status] - 'initiated' | 'ringing' | 'ongoing' | 'completed' | 'missed' | 'failed' | 'cancelled'
   * @param {number} [params.customer_id]
   * @param {number} [params.agent_id]
   * @param {string} [params.search]
   * @returns {Promise<Array<any>>}
   */
  getCalls: async (params = {}) => {
    const response = await apiClient.get('/calls', { params });
    return response.data;
  },

  /**
   * Get single call by ID
   * @param {number} callId
   * @returns {Promise<any>}
   */
  getCall: async (callId) => {
    const response = await apiClient.get(`/calls/${callId}`);
    return response.data;
  },

  /**
   * Create a new call record
   * @param {Object} data
   * @param {number} data.customer_id
   * @param {string} data.direction - 'incoming' | 'outgoing'
   * @param {string} data.platform - 'phone' | 'whatsapp' | etc.
   * @param {string} [data.status='initiated']
   * @param {number} [data.agent_id]
   * @param {string} [data.subject]
   * @param {string} [data.notes]
   * @param {string} [data.meeting_url]
   * @param {string} [data.recording_url]
   * @returns {Promise<any>}
   */
  createCall: async (data) => {
    const response = await apiClient.post('/calls', data);
    return response.data;
  },

  /**
   * Update a call record
   * @param {number} callId
   * @param {Object} data
   * @returns {Promise<any>}
   */
  updateCall: async (callId, data) => {
    const response = await apiClient.put(`/calls/${callId}`, data);
    return response.data;
  },

  /**
   * Update lifecycle status of a call
   * @param {number} callId
   * @param {string} status - 'initiated' | 'ringing' | 'ongoing' | 'completed' | 'missed' | 'failed' | 'cancelled'
   * @returns {Promise<any>}
   */
  updateCallStatus: async (callId, status) => {
    const response = await apiClient.patch(`/calls/${callId}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Reassign call to an agent (Admin only)
   * @param {number} callId
   * @param {number} agentId
   * @returns {Promise<any>}
   */
  assignCall: async (callId, agentId) => {
    const response = await apiClient.patch(`/calls/${callId}/assign`, {
      agent_id: agentId,
    });
    return response.data;
  },

  /**
   * Initiate outgoing telephony call via configured communication provider (e.g. Mock/Twilio)
   * @param {number} callId
   * @param {string} [provider]
   * @returns {Promise<any>}
   */
  initiateCall: async (callId, provider) => {
    const response = await apiClient.post(`/calls/${callId}/initiate`, null, {
      params: provider ? { provider } : {},
    });
    return response.data;
  },

  /**
   * Start a call record
   * @param {number} callId
   * @returns {Promise<any>}
   */
  startCall: async (callId) => {
    const response = await apiClient.post(`/calls/${callId}/start`);
    return response.data;
  },

  /**
   * Complete a call record
   * @param {number} callId
   * @returns {Promise<any>}
   */
  completeCall: async (callId) => {
    const response = await apiClient.post(`/calls/${callId}/complete`);
    return response.data;
  },

  /**
   * Soft delete call record
   * @param {number} callId
   * @returns {Promise<any>}
   */
  deleteCall: async (callId) => {
    const response = await apiClient.delete(`/calls/${callId}`);
    return response.data;
  },

  /**
   * Record or update call outcome
   * @param {number} callId
   * @param {string} outcome
   * @param {string} [notes]
   * @returns {Promise<any>}
   */
  recordCallOutcome: async (callId, outcome, notes = 'Updated via dashboard') => {
    const response = await apiClient.post('/call-outcomes', {
      call_id: callId,
      outcome,
      notes,
    });
    return response.data;
  },
};

export default callService;
