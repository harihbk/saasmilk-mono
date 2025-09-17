const Company = require('../models/Company');

// Middleware to extract and validate tenant information
const extractTenant = async (req, res, next) => {
  try {
    let tenantId = null;
    
    // Try to get tenantId from different sources
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    } else if (req.query.tenantId) {
      tenantId = req.query.tenantId;
    } else if (req.body.tenantId) {
      tenantId = req.body.tenantId;
    } else if (req.user && req.user.tenantId) {
      tenantId = req.user.tenantId;
    }
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    // Validate tenant exists and is active
    const company = await Company.findOne({ 
      tenantId: tenantId.toUpperCase(),
      isActive: true,
      isSuspended: false
    });
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or suspended'
      });
    }
    
    // Check subscription status
    if (!company.isSubscriptionActive()) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription is not active',
        subscriptionStatus: company.subscription.status,
        daysRemaining: company.daysRemaining
      });
    }
    
    // Add tenant info to request
    req.tenant = {
      id: tenantId.toUpperCase(),
      company: company
    };
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating tenant'
    });
  }
};

// Middleware to ensure user belongs to the tenant
const validateTenantAccess = (req, res, next) => {
  if (!req.user || !req.tenant) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  // Super admin can access any tenant
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  // Check if user belongs to the tenant
  if (req.user.tenantId !== req.tenant.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: User does not belong to this company'
    });
  }
  
  next();
};

// Middleware to check subscription limits
const checkSubscriptionLimit = (resource, count = 1) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') {
      return next(); // Super admin bypasses limits
    }
    
    if (!req.tenant || !req.tenant.company) {
      return res.status(400).json({
        success: false,
        message: 'Tenant information required'
      });
    }
    
    const limitCheck = req.tenant.company.checkSubscriptionLimit(resource, count);
    
    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: limitCheck.message,
        resource: resource,
        currentPlan: req.tenant.company.subscription.plan
      });
    }
    
    next();
  };
};

// Middleware to check feature access
const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') {
      return next(); // Super admin bypasses feature restrictions
    }
    
    if (!req.tenant || !req.tenant.company) {
      return res.status(400).json({
        success: false,
        message: 'Tenant information required'
      });
    }
    
    if (!req.tenant.company.hasFeature(featureName)) {
      return res.status(403).json({
        success: false,
        message: `Feature '${featureName}' not available in current plan`,
        currentPlan: req.tenant.company.subscription.plan,
        feature: featureName
      });
    }
    
    next();
  };
};

// Helper function to add tenant filter to mongoose queries
const addTenantFilter = (req) => {
  if (req.user.role === 'super_admin') {
    return {}; // Super admin sees all data
  }
  
  return { tenantId: req.tenant.id };
};

// Middleware to automatically add tenant filter to requests
const autoTenantFilter = (req, res, next) => {
  // Add tenant filter to query
  req.tenantFilter = addTenantFilter(req);
  
  // Ensure any data being created has the tenant ID
  if (req.body && typeof req.body === 'object' && req.tenant && req.tenant.id) {
    req.body.tenantId = req.tenant.id;
  }
  
  next();
};

// Optional tenant extraction - doesn't fail if no tenant
const extractTenantOptional = async (req, res, next) => {
  try {
    let tenantId = null;
    
    // Try to get tenantId from different sources
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    } else if (req.query.tenantId) {
      tenantId = req.query.tenantId;
    } else if (req.body.tenantId) {
      tenantId = req.body.tenantId;
    } else if (req.user && req.user.tenantId) {
      tenantId = req.user.tenantId;
    }
    
    if (!tenantId) {
      // For optional extraction, just continue without tenant
      req.tenant = null;
      return next();
    }
    
    // Validate tenant exists and is active
    const company = await Company.findOne({ 
      tenantId: tenantId.toUpperCase(),
      isActive: true,
      isSuspended: false
    });
    
    if (!company) {
      req.tenant = null;
      return next();
    }
    
    // Check subscription status
    if (!company.isSubscriptionActive()) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription is not active',
        subscriptionStatus: company.subscription.status,
        daysRemaining: company.daysRemaining
      });
    }
    
    // Add tenant info to request
    req.tenant = {
      id: tenantId.toUpperCase(),
      company: company
    };
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    req.tenant = null;
    next(); // Continue without tenant for optional extraction
  }
};

module.exports = {
  extractTenant,
  extractTenantOptional,
  validateTenantAccess,
  checkSubscriptionLimit,
  requireFeature,
  addTenantFilter,
  autoTenantFilter
};