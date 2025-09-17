import api from './api';

export const dashboardAPI = {
  // Get dealer-wise outstanding amounts
  getDealerOutstanding: async () => {
    try {
      const response = await api.get('/dashboard/dealer-outstanding');
      return response.data;
    } catch (error) {
      console.error('Error fetching dealer outstanding data:', error);
      throw error;
    }
  },

  // Get route-wise outstanding amounts
  getRouteOutstanding: async () => {
    try {
      const response = await api.get('/dashboard/route-outstanding');
      return response.data;
    } catch (error) {
      console.error('Error fetching route outstanding data:', error);
      throw error;
    }
  },

  // Get recent orders (non-overlapping)
  getRecentOrders: async (limit = 10) => {
    try {
      const response = await api.get(`/dashboard/recent-orders?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  },

  // Get dashboard summary stats
  getSummary: async () => {
    try {
      const response = await api.get('/dashboard/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }
};

export default dashboardAPI;