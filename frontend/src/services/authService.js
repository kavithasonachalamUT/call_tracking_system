import apiClient from './api';

export const authService = {
  /**
   * Authenticate user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{access_token: string, token_type: string}>}
   */
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email: email.trim(),
      password,
    });
    return response.data;
  },

  /**
   * Fetch profile of the currently authenticated user
   * @returns {Promise<{id: number, name: string, email: string, role: string, is_active: boolean}>}
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authService;
