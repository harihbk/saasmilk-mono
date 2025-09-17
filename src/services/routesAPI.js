import api from './api';

const routesAPI = {
  // Get all routes
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    // Add pagination
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Add sorting
    if (params.sort) queryParams.append('sort', params.sort);
    
    // Add search
    if (params.search) queryParams.append('search', params.search);
    
    // Add filters
    if (params.status) queryParams.append('status', params.status);
    if (params.city) queryParams.append('city', params.city);
    if (params.state) queryParams.append('state', params.state);
    if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo);
    
    return api.get(`/routes?${queryParams.toString()}`);
  },

  // Get single route
  getById: (id) => {
    return api.get(`/routes/${id}`);
  },

  // Create new route
  create: (routeData) => {
    return api.post('/routes', routeData);
  },

  // Update route
  update: (id, routeData) => {
    return api.put(`/routes/${id}`, routeData);
  },

  // Delete route
  delete: (id) => {
    return api.delete(`/routes/${id}`);
  },

  // Get route statistics
  getStats: () => {
    return api.get('/routes/meta/stats');
  },

  // Get route-wise outstanding metrics
  getOutstandingMetrics: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.routeId) queryParams.append('routeId', params.routeId);
    
    return api.get(`/routes/meta/outstanding-metrics?${queryParams.toString()}`);
  },

  // Update dealer count for route
  updateDealerCount: (id) => {
    return api.put(`/routes/${id}/update-dealer-count`);
  }
};

export default routesAPI;