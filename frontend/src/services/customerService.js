import apiClient from './api';

export const customerService = {
  /**
   * List customers with optional search and pagination
   * @param {Object} [params]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=50]
   * @param {string} [params.search]
   * @returns {Promise<Array<{
   *   id: number,
   *   name: string,
   *   phone: string,
   *   email?: string,
   *   company?: string,
   *   address?: string,
   *   notes?: string,
   *   is_active: boolean,
   *   created_at: string,
   *   updated_at: string
   * }>>}
   */
  getCustomers: async (params = {}) => {
    const response = await apiClient.get('/customers', { params });
    return response.data;
  },

  /**
   * Get single customer by ID
   * @param {number} customerId
   * @returns {Promise<any>}
   */
  getCustomer: async (customerId) => {
    const response = await apiClient.get(`/customers/${customerId}`);
    return response.data;
  },

  /**
   * Create new customer profile
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.phone
   * @param {string} [data.email]
   * @param {string} [data.company]
   * @param {string} [data.address]
   * @param {string} [data.notes]
   * @returns {Promise<any>}
   */
  createCustomer: async (data) => {
    const response = await apiClient.post('/customers', data);
    return response.data;
  },

  /**
   * Update customer profile
   * @param {number} customerId
   * @param {Object} data
   * @returns {Promise<any>}
   */
  updateCustomer: async (customerId, data) => {
    const response = await apiClient.put(`/customers/${customerId}`, data);
    return response.data;
  },

  /**
   * Soft deactivate customer profile
   * @param {number} customerId
   * @returns {Promise<any>}
   */
  deleteCustomer: async (customerId) => {
    const response = await apiClient.delete(`/customers/${customerId}`);
    return response.data;
  },
};

export default customerService;
