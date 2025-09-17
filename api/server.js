const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware - Temporarily disable CSP for debugging
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Rate limiting (more permissive for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV === 'development';
  }
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-company', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  // Load all models to ensure they are registered
  require('./models');
})
.catch((err) => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const saasAuthRoutes = require('./routes/saasAuth');
const saasAdminTenantRoutes = require('./routes/saasAdminTenants');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const supplierRoutes = require('./routes/suppliers');
const inventoryRoutes = require('./routes/inventory');
const categoryRoutes = require('./routes/categories');
const dealerGroupRoutes = require('./routes/dealerGroups');
const dealerRoutes = require('./routes/dealers');
const warehouseRoutes = require('./routes/warehouses');
const routeRoutes = require('./routes/routes');
const roleRoutes = require('./routes/roles');
const companyRoutes = require('./routes/companies');
const billingRoutes = require('./routes/billing');
const debugRoutes = require('./routes/debug');
const companySettingsRoutes = require('./routes/companySettings');
const fleetRoutes = require('./routes/fleet');
const fleetMaintenanceRoutes = require('./routes/fleetMaintenance');
const menuRoutes = require('./routes/menu');
const dashboardRoutes = require('./routes/dashboard');
const procurementRoutes = require('./routes/procurement');

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Milk Company API Server is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      orders: '/api/orders',
      customers: '/api/customers',
      suppliers: '/api/suppliers',
      inventory: '/api/inventory',
      categories: '/api/categories',
      dealerGroups: '/api/dealer-groups',
      dealers: '/api/dealers',
      warehouses: '/api/warehouses',
      routes: '/api/routes',
      roles: '/api/roles',
      companies: '/api/companies',
      billing: '/api/billing',
      fleet: '/api/fleet',
      fleetMaintenance: '/api/fleet-maintenance',
      menu: '/api/menu',
      procurement: '/api/procurement',
      debug: '/api/debug'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api', saasAuthRoutes);
app.use('/api/saas-admin/tenants', saasAdminTenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dealer-groups', dealerGroupRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/fleet-maintenance', fleetMaintenanceRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/procurement', procurementRoutes);

// Debug routes (development only)
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use('/api/debug', debugRoutes);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
