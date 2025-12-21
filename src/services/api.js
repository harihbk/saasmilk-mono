import axios from 'axios';

// API base URL is now configured via environment variable
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});





// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');

    console.log('API Request Interceptor:', {
      url: config.url,
      method: config.method,
      token: token ? 'Present' : 'Missing',
      tenantId: tenantId || 'Missing'
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response Success:', {
      url: response.config.url,
      status: response.status,
      dataStructure: Object.keys(response.data)
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    if (error.response?.status === 401) {
      console.warn('Authentication failed - clearing credentials');
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      window.location.href = '/milk/login';
    }
    return Promise.reject(error);
  }
);

export const payrollAPI = {
  getEmployees: () => api.get('/payroll/employees'),
  updateConfig: (userId, data) => api.put(`/payroll/config/${userId}`, data),
  createAdvance: (data) => api.post('/payroll/advance', data),
  getAdvances: (userId) => api.get(`/payroll/advance/${userId}`),
  generatePayroll: (data) => api.post('/payroll/generate', data),
  deletePayroll: (id) => api.delete(`/payroll/${id}`),
  verifyPayroll: (id) => api.put(`/payroll/${id}/verify`),
  payPayroll: (id, data) => api.put(`/payroll/${id}/pay`, data),
  getHistory: (month) => api.get('/payroll/history', { params: { month } }),
};

export default api;

// API service functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  changePassword: (id, data) => api.put(`/users/${id}/password`, data),
  updateSubscription: (id, data) => api.put(`/users/${id}/subscription`, data),
  getUserStats: () => api.get('/users/meta/stats'),
};

export const rolesAPI = {
  getRoles: (params) => api.get('/roles', { params }),
  getRole: (id) => api.get(`/roles/${id}`),
  createRole: (data) => api.post('/roles', data),
  updateRole: (id, data) => api.put(`/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/roles/${id}`),
  initializeRoles: () => api.post('/roles/init'),
  getRoleStats: () => api.get('/roles/meta/stats'),
};

export const companiesAPI = {
  getCompanies: (params) => api.get('/companies', { params }),
  getCompany: (id) => api.get(`/companies/${id}`),
  createCompany: (data) => api.post('/companies', data),
  updateCompany: (id, data) => api.put(`/companies/${id}`, data),
  uploadLogo: (id, formData) => api.post(`/companies/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteLogo: (id) => api.delete(`/companies/${id}/logo`),
  suspendCompany: (id, data) => api.put(`/companies/${id}/suspend`, data),
  updateSubscription: (id, data) => api.put(`/companies/${id}/subscription`, data),
  addNote: (id, data) => api.post(`/companies/${id}/notes`, data),
  getCompanyStats: () => api.get('/companies/meta/stats'),
};

export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/meta/categories'),
  getBrands: () => api.get('/products/meta/brands'),
  getLowStockProducts: (params) => api.get('/products/alerts/low-stock', { params }),
};

export const ordersAPI = {
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  updateOrderStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  assignOrder: (id, data) => api.put(`/orders/${id}/assign`, data),
  updatePayment: (id, data) => api.put(`/orders/${id}/payment`, data),
  getOrderStats: () => api.get('/orders/meta/stats'),
  checkStock: (data) => api.post('/orders/check-stock', data),
};

export const customersAPI = {
  getCustomers: (params) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
  addNote: (id, data) => api.post(`/customers/${id}/notes`, data),
  assignCustomer: (id, data) => api.put(`/customers/${id}/assign`, data),
  updateLoyalty: (id, data) => api.put(`/customers/${id}/loyalty`, data),
  getCustomerStats: () => api.get('/customers/meta/stats'),
};

export const suppliersAPI = {
  getSuppliers: (params) => api.get('/suppliers', { params }),
  getSupplier: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),
  addNote: (id, data) => api.post(`/suppliers/${id}/notes`, data),
  assignSupplier: (id, data) => api.put(`/suppliers/${id}/assign`, data),
  updatePerformance: (id, data) => api.put(`/suppliers/${id}/performance`, data),
  getSupplierStats: () => api.get('/suppliers/meta/stats'),
};

export const inventoryAPI = {
  getInventory: (params) => api.get('/inventory', { params }),
  getInventoryItem: (id) => api.get(`/inventory/${id}`),
  createInventoryItem: (data) => api.post('/inventory', data),
  updateInventoryItem: (id, data) => api.put(`/inventory/${id}`, data),
  addMovement: (id, data) => api.post(`/inventory/${id}/movements`, data),
  reserveStock: (id, data) => api.post(`/inventory/${id}/reserve`, data),
  releaseStock: (id, data) => api.post(`/inventory/${id}/release`, data),
  getAlerts: (params) => api.get('/inventory/meta/alerts', { params }),
  acknowledgeAlert: (id, alertId) => api.put(`/inventory/${id}/alerts/${alertId}/acknowledge`),
  bulkUpdate: (data) => api.post('/inventory/bulk-update', data),
};

export const subCategoriesAPI = {
  getSubCategories: (params) => api.get('/subcategories', { params }),
  getSubCategory: (id) => api.get(`/subcategories/${id}`),
  createSubCategory: (data) => api.post('/subcategories', data),
  updateSubCategory: (id, data) => api.put(`/subcategories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/subcategories/${id}`),
  getActiveSubCategories: (params) => api.get('/subcategories/meta/active', { params }),
};


export const categoriesAPI = {
  getCategories: (params) => api.get('/categories', { params }),
  getCategory: (id) => api.get(`/categories/${id}`),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  getActiveCategories: () => api.get('/categories/meta/active'),
};

export const dealerGroupsAPI = {
  getDealerGroups: (params) => api.get('/dealer-groups', { params }),
  getDealerGroup: (id) => api.get(`/dealer-groups/${id}`),
  createDealerGroup: (data) => api.post('/dealer-groups', data),
  updateDealerGroup: (id, data) => api.put(`/dealer-groups/${id}`, data),
  deleteDealerGroup: (id) => api.delete(`/dealer-groups/${id}`),
  getActiveDealerGroups: () => api.get('/dealer-groups/meta/active'),
  getDealerGroupStats: () => api.get('/dealer-groups/meta/stats'),

  // Pricing endpoints
  getDealerGroupPricing: (id, params) => api.get(`/dealer-groups/${id}/pricing`, { params }),
  setDealerGroupPricing: (id, data) => api.post(`/dealer-groups/${id}/pricing`, data),
  updateDealerGroupPricing: (groupId, pricingId, data) => api.put(`/dealer-groups/${groupId}/pricing/${pricingId}`, data),
  deleteDealerGroupPricing: (groupId, pricingId) => api.delete(`/dealer-groups/${groupId}/pricing/${pricingId}`),
  bulkUpdatePricing: (id, data) => api.post(`/dealer-groups/${id}/pricing/bulk`, data),
  comparePricing: (params) => api.get('/dealer-groups/pricing/compare', { params }),
};

export const dealersAPI = {
  getDealers: (params) => api.get('/dealers', { params }),
  getDealer: (id) => api.get(`/dealers/${id}`),
  createDealer: (data) => api.post('/dealers', data),
  updateDealer: (id, data) => api.put(`/dealers/${id}`, data),
  deleteDealer: (id) => api.delete(`/dealers/${id}`),
  updateDealerBalance: (id, data) => api.put(`/dealers/${id}/balance`, data),
  addDealerNote: (id, data) => api.post(`/dealers/${id}/notes`, data),
  getDealersByGroup: (groupId, params) => api.get(`/dealers/group/${groupId}`, { params }),
  getDealerStats: () => api.get('/dealers/meta/stats'),
  getDealerBalanceSheet: (id, params) => api.get(`/dealers/${id}/balance-sheet`, { params }),

  // Dealer Pricing Endpoints - Specific to individual dealers
  getDealerPricing: (id, params) => api.get(`/dealers/${id}/pricing`, { params }),
  setDealerPricing: (id, data) => api.post(`/dealers/${id}/pricing`, data),
  updateDealerPricing: (dealerId, pricingId, data) => api.put(`/dealers/${dealerId}/pricing/${pricingId}`, data),
  deleteDealerPricing: (dealerId, pricingId) => api.delete(`/dealers/${dealerId}/pricing/${pricingId}`),
  bulkUpdateDealerPricing: (id, data) => api.post(`/dealers/${id}/pricing/bulk`, data),
};

export const warehousesAPI = {
  getWarehouses: (params) => api.get('/warehouses', { params }),
  getWarehouse: (id) => api.get(`/warehouses/${id}`),
  createWarehouse: (data) => api.post('/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/warehouses/${id}`, data),
  deleteWarehouse: (id) => api.delete(`/warehouses/${id}`),
  getActiveWarehouses: () => api.get('/warehouses/active'),
  getWarehouseStats: () => api.get('/warehouses/meta/stats'),
};

// Billing API
export const billingAPI = {
  // Get all billing records (super admin only)
  getBillings: (params) => api.get('/billing', { params }),

  // Get billing for specific tenant
  getBilling: (tenantId) => api.get(`/billing/${tenantId}`),

  // Create billing record
  createBilling: (data) => api.post('/billing', data),

  // Update billing/subscription
  updateBilling: (tenantId, data) => api.put(`/billing/${tenantId}`, data),

  // Usage management
  updateUsage: (tenantId, data) => api.post(`/billing/${tenantId}/usage`, data),
  getUsage: (tenantId) => api.get(`/billing/${tenantId}/usage`),

  // Invoice management
  createInvoice: (tenantId, data) => api.post(`/billing/${tenantId}/invoices`, data),
  getInvoices: (tenantId) => api.get(`/billing/${tenantId}/invoices`),

  // Payment processing
  processPayment: (tenantId, data) => api.post(`/billing/${tenantId}/payments`, data),

  // Dashboard stats (super admin only)
  getDashboardStats: () => api.get('/billing/dashboard/stats'),
};

// Debug API (development only)
export const debugAPI = {
  getCollections: () => api.get('/debug/collections'),
  getInventory: () => api.get('/debug/inventory'),
  getDealers: () => api.get('/debug/dealers'),
  getOrders: () => api.get('/debug/orders'),
  createSampleInventory: () => api.post('/debug/create-sample-inventory'),
  testStockCheck: (data) => api.post('/debug/test-stock-check', data),
  createDefaultWarehouses: () => api.post('/debug/create-default-warehouses'),
  migrateInventoryWarehouses: () => api.post('/debug/migrate-inventory-warehouses'),
  getStockAnalysis: () => api.get('/debug/stock-analysis'),
  testSaasLogin: (data) => api.post('/debug/test-saas-login', data),
  createTestTenant: () => api.post('/debug/create-test-tenant'),
};

// SaaS Admin API - Separate instance with different token handling
export const saasApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});



// SaaS Admin request interceptor
saasApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('saas_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// SaaS Admin response interceptor
saasApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('saas_admin_token');
      localStorage.removeItem('saas_admin_user');
      window.location.href = '/milk/saas-admin/login';
    }
    return Promise.reject(error);
  }
);

// SaaS Admin API functions
export const saasAdminAPI = {
  login: (credentials) => saasApi.post('/saas-admin/login', credentials),
  getProfile: () => saasApi.get('/saas-admin/profile'),
  getStats: () => saasApi.get('/saas-admin/stats'),
  getCompanies: (params) => saasApi.get('/saas-admin/companies', { params }),
  suspendCompany: (id, data) => saasApi.patch(`/saas-admin/companies/${id}/suspend`, data),

  // Tenant Management APIs
  getTenants: (params) => saasApi.get('/saas-admin/tenants', { params }),
  getTenant: (id) => saasApi.get(`/saas-admin/tenants/${id}`),
  createTenant: (data) => saasApi.post('/saas-admin/tenants', data),
  updateTenant: (id, data) => saasApi.put(`/saas-admin/tenants/${id}`, data),
  activateTenant: (id, data) => saasApi.patch(`/saas-admin/tenants/${id}/activate`, data),
  suspendTenant: (id, data) => saasApi.patch(`/saas-admin/tenants/${id}/suspend`, data),
  deleteTenant: (id) => saasApi.delete(`/saas-admin/tenants/${id}`),
};

// Fleet API
export const fleetAPI = {
  getVehicles: (params) => api.get('/fleet', { params }),
  getVehicle: (id) => api.get(`/fleet/${id}`),
  createVehicle: (data) => api.post('/fleet', data),
  updateVehicle: (id, data) => api.put(`/fleet/${id}`, data),
  deleteVehicle: (id) => api.delete(`/fleet/${id}`),
  getStats: () => api.get('/fleet/meta/stats'),
  getAvailableDrivers: () => api.get('/fleet/available-drivers'),
  getServiceDue: (params) => api.get('/fleet/meta/service-due', { params }),
};

// Fleet Maintenance API
export const fleetMaintenanceAPI = {
  getMaintenanceRecords: (params) => api.get('/fleet-maintenance', { params }),
  getMaintenanceRecord: (id) => api.get(`/fleet-maintenance/${id}`),
  createMaintenanceRecord: (data) => api.post('/fleet-maintenance', data),
  updateMaintenanceRecord: (id, data) => api.put(`/fleet-maintenance/${id}`, data),
  deleteMaintenanceRecord: (id) => api.delete(`/fleet-maintenance/${id}`),
  getStats: () => api.get('/fleet-maintenance/meta/stats'),
  getUpcomingMaintenance: () => api.get('/fleet-maintenance/meta/upcoming'),
};


// Inventory Stock API
export const inventoryStockAPI = {
  // Get all inventory items (with pagination, search, filters)
  getInventory: (params) => api.get('/inventorystock', { params }),

  // Get single inventory item
  getInventoryItem: (id) => api.get(`/inventorystock/${id}`),

  // CRUD
  createInventoryItem: (data) => api.post('/inventorystock', data),
  updateInventoryItem: (id, data) => api.put(`/inventorystock/${id}`, data),
  deleteInventoryItem: (id) => api.delete(`/inventorystock/${id}`),
  // Stock movements
  purchaseStock: (id, data) => api.post(`/inventorystock/${id}/purchase`, data),
  consumeStock: (id, data) => api.post(`/inventorystock/${id}/consume`, data),
  // Optional aliases (if you prefer purchase/consume naming)
  purchase: (id, data) => api.post(`/inventorystock/${id}/purchase`, data),
  consume: (id, data) => api.post(`/inventorystock/${id}/consume`, data),
  // Alerts (future use)
  getLowStockAlerts: (params) => api.get('/inventorystock/meta/alerts', { params }),
};


export const autoStockAPI = {

};

export const assetsAPI = {
  getAssets: (params) => api.get('/assets', { params }),
  createAsset: (data) => api.post('/assets', data),
  updateAsset: (id, data) => api.put(`/assets/${id}`, data),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
};

export const gatePassesAPI = {
  getGatePasses: (params) => api.get('/gate-passes', { params }),
  createGatePass: (data) => api.post('/gate-passes', data),
  updateGatePass: (id, data) => api.put(`/gate-passes/${id}`, data),
  deleteGatePass: (id) => api.delete(`/gate-passes/${id}`),
  getPendingReturns: (params) => api.get('/gate-passes/pending-returns', { params }),
};

export const companySettingsAPI = {
  getSettings: () => api.get('/company-settings'),
  updateSettings: (data) => api.put('/company-settings', data),
  updateLogo: (data) => api.put('/company-settings/logo', data),
  updateBusinessDetails: (data) => api.put('/company-settings/business-details', data),
  getSubscription: () => api.get('/company-settings/subscription'),
};

export const invoicesAPI = {
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  createInvoiceFromOrder: (orderId) => api.post('/invoices/from-order', { orderId }),
};

export const receiptsAPI = {
  getReceipts: (params) => api.get('/receipts', { params }),
  getReceipt: (id) => api.get(`/receipts/${id}`),
  createReceipt: (data) => api.post('/receipts', data),
  updateReceipt: (id, data) => api.put(`/receipts/${id}`, data),
  convertInvoice: (id) => api.post(`/receipts/${id}/invoice`),
  undoReceipt: (id) => api.post(`/receipts/${id}/undo`),
};

export const reportsAPI = {
  getCategoryWiseReport: (params) => api.get('/reports/category-wise', { params }),
  getSubCategoryWiseReport: (params) => api.get('/reports/subcategory-wise', { params }),
  getProductSalesReport: (params) => api.get('/reports/sales-by-product', { params }),
  getGstAuditReport: (params) => api.get('/reports/gst-audit', { params }),
};