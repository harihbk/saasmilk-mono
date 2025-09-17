import api from './api';

export const procurementAPI = {
  // Get all procurements
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    return api.get(`/procurement?${queryParams.toString()}`);
  },

  // Get single procurement
  getById: (id) => api.get(`/procurement/${id}`),

  // Create new procurement
  create: (data) => api.post('/procurement', data),

  // Update procurement
  update: (id, data) => api.put(`/procurement/${id}`, data),

  // Delete procurement
  delete: (id) => api.delete(`/procurement/${id}`),

  // Update received quantities
  updateReceived: (id, data) => api.put(`/procurement/${id}/receive`, data),

  // Add approval
  addApproval: (id, data) => api.post(`/procurement/${id}/approvals`, data),

  // Process approval (approve/reject)
  processApproval: (id, approvalId, data) => 
    api.put(`/procurement/${id}/approvals/${approvalId}`, data),

  // Get procurement statistics
  getStats: () => api.get('/procurement/stats/dashboard'),

  // Check stock availability
  checkStock: (data) => api.post('/procurement/check-stock', data),
};

export default procurementAPI;