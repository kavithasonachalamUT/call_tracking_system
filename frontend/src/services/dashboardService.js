import apiClient from './api';

export const dashboardService = {
  /**
   * Fetch complete dashboard overview metrics, recent calls, upcoming follow-ups, and recent outcomes
   * @returns {Promise<{
   *   summary: {
   *     total_calls: number,
   *     incoming_calls: number,
   *     outgoing_calls: number,
   *     completed_calls: number,
   *     missed_calls: number,
   *     failed_calls: number,
   *     ongoing_calls: number,
   *     total_duration_seconds: number,
   *     avg_duration_seconds: number
   *   },
   *   recent_calls: Array<{
   *     call_id: number,
   *     customer_id: number,
   *     customer_name: string,
   *     customer_phone: string,
   *     agent_id: number,
   *     agent_name: string,
   *     direction: string,
   *     status: string,
   *     duration_seconds?: number,
   *     start_time?: string,
   *     end_time?: string,
   *     outcome?: string
   *   }>,
   *   upcoming_follow_ups: Array<{
   *     follow_up_id: number,
   *     call_id: number,
   *     customer_id: number,
   *     customer_name: string,
   *     assigned_to: number,
   *     assigned_user_name: string,
   *     follow_up_type: string,
   *     status: string,
   *     scheduled_at: string,
   *     notes?: string
   *   }>,
   *   recent_outcomes: Array<{
   *     outcome_id: number,
   *     call_id: number,
   *     customer_id: number,
   *     customer_name: string,
   *     agent_id: number,
   *     agent_name: string,
   *     outcome: string,
   *     notes?: string,
   *     created_at: string
   *   }>
   * }>}
   */
  getDashboardOverview: async () => {
    const response = await apiClient.get('/dashboard/overview');
    return response.data;
  },

  /**
   * Fetch detailed live call activity feed
   * @param {number} [limit=20]
   * @returns {Promise<Array<{
   *   call_id: number,
   *   customer_id: number,
   *   customer_name: string,
   *   customer_phone: string,
   *   agent_id: number,
   *   agent_name: string,
   *   direction: string,
   *   status: string,
   *   duration_seconds?: number,
   *   started_at?: string,
   *   ended_at?: string,
   *   outcome?: string,
   *   follow_up_count: number
   * }>>}
   */
  getDashboardActivity: async (limit = 20) => {
    const response = await apiClient.get(`/dashboard/activity?limit=${limit}`);
    return response.data;
  },

  /**
   * Fetch user notification counts
   * @returns {Promise<{unread_count: number, total_count: number}>}
   */
  getNotificationSummary: async () => {
    const response = await apiClient.get('/notifications/summary');
    return response.data;
  },
};

export default dashboardService;
