import apiClient from './api';

export const analyticsService = {
  /**
   * Get full analytics overview
   * @returns {Promise<{
   *   call_summary: {
   *     total_calls: number,
   *     incoming_calls: number,
   *     outgoing_calls: number,
   *     status_breakdown: Record<string, number>,
   *     total_duration_seconds: number,
   *     avg_duration_seconds: number,
   *     incoming_total_duration_seconds: number,
   *     incoming_avg_duration_seconds: number,
   *     outgoing_total_duration_seconds: number,
   *     outgoing_avg_duration_seconds: number
   *   },
   *   outcome_summary: {
   *     total_outcomes: number,
   *     outcome_breakdown: Record<string, number>
   *   },
   *   follow_up_summary: {
   *     total_follow_ups: number,
   *     status_breakdown: Record<string, number>,
   *     type_breakdown: Record<string, number>
   *   },
   *   agent_performance: Array<{
   *     agent_id: number,
   *     agent_name: string,
   *     agent_email: string,
   *     total_calls: number,
   *     incoming_calls: number,
   *     outgoing_calls: number,
   *     completed_calls: number,
   *     total_duration_seconds: number,
   *     avg_duration_seconds: number,
   *     outcomes_recorded: number,
   *     follow_ups_assigned: number
   *   }>
   * }>}
   */
  getAnalyticsOverview: async () => {
    const response = await apiClient.get('/analytics/overview');
    return response.data;
  },

  /**
   * Get call summary statistics
   */
  getCallSummary: async () => {
    const response = await apiClient.get('/analytics/calls');
    return response.data;
  },

  /**
   * Get outcome summary
   */
  getOutcomeSummary: async () => {
    const response = await apiClient.get('/analytics/outcomes');
    return response.data;
  },

  /**
   * Get follow-up summary
   */
  getFollowUpSummary: async () => {
    const response = await apiClient.get('/analytics/follow-ups');
    return response.data;
  },

  /**
   * Get agent performance metrics
   */
  getAgentPerformance: async () => {
    const response = await apiClient.get('/analytics/agents');
    return response.data;
  },
};

export default analyticsService;
