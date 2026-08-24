import apiClient from './api';

export const userService = {
  /**
   * List users (Admin only)
   * @param {Object} [params]
   * @returns {Promise<Array<any>>}
   */
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  /**
   * Get current authenticated user profile
   * @returns {Promise<any>}
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
};

export default userService;
