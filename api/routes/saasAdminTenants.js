const express = require('express');
const { body, param, query } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const { handleValidationErrors, sanitizeInput, validatePagination } = require('../middleware/validation');

const router = express.Router();

// SaaS Admin JWT verification middleware (specific for tenant management)
const verifySaasAdminForTenants = (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'saas_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SaaS admin privileges required for tenant management.'
      });
    }

    req.saasAdmin = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// @desc    Get all tenants/companies
// @route   GET /api/saas-admin/tenants
// @access  Private (SaaS Admin only)
router.get('/', [
  verifySaasAdminForTenants,
  validatePagination,
  query('search').optional().isString().trim(),
  query('plan').optional().isIn(['trial', 'basic', 'professional', 'enterprise']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('isActive').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, plan, status, isActive } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tenantId: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (plan) query['subscription.plan'] = plan;
    if (status) query['subscription.status'] = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Execute query with population
    const companies = await Company.find(query)
      .populate('owner', 'name email role isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-notes'); // Exclude notes for list view

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      data: {
        tenants: companies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tenants'
    });
  }
});

// @desc    Get single tenant
// @route   GET /api/saas-admin/tenants/:id
// @access  Private (SaaS Admin only)
router.get('/:id', [
  verifySaasAdminForTenants,
  param('id').isMongoId().withMessage('Invalid tenant ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('owner', 'name email phone role isActive lastLogin')
      .populate('notes.createdBy', 'name email');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get tenant users count
    const userCount = await User.countDocuments({ 
      company: company._id,
      role: { $ne: 'super_admin' }
    });

    // Get active users count
    const activeUserCount = await User.countDocuments({ 
      company: company._id,
      isActive: true,
      role: { $ne: 'super_admin' }
    });

    res.json({
      success: true,
      data: {
        tenant: {
          ...company.toObject(),
          stats: {
            totalUsers: userCount,
            activeUsers: activeUserCount
          }
        }
      }
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tenant'
    });
  }
});

// @desc    Create new tenant
// @route   POST /api/saas-admin/tenants
// @access  Private (SaaS Admin only)
router.post('/', [
  verifySaasAdminForTenants,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('tenantId')
    .trim()
    .isLength({ min: 2, max: 20 })
    .isAlphanumeric()
    .withMessage('Tenant ID must be 2-20 alphanumeric characters')
    .custom(async (value) => {
      const existing = await Company.findOne({ tenantId: value.toUpperCase() });
      if (existing) {
        throw new Error('Tenant ID already exists');
      }
      return true;
    }),
  body('contactInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('contactInfo.phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('subscription.plan')
    .optional()
    .isIn(['trial', 'basic', 'professional', 'enterprise'])
    .withMessage('Invalid subscription plan'),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      name,
      tenantId,
      contactInfo,
      businessInfo,
      subscription
    } = req.body;

    // Create a temporary owner user ID (this will be updated when the company owner registers)
    const ObjectId = require('mongoose').Types.ObjectId;
    const tempOwnerId = new ObjectId();

    // Create company
    const company = new Company({
      name,
      tenantId: tenantId.toUpperCase(),
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      contactInfo,
      businessInfo: businessInfo || {},
      owner: tempOwnerId, // Temporary owner - will be updated when actual owner registers
      subscription: {
        plan: subscription?.plan || 'trial',
        status: 'active',
        startDate: new Date(),
        endDate: subscription?.plan === 'trial' 
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days for trial
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for paid plans
        maxUsers: subscription?.maxUsers || 5,
        maxProducts: subscription?.maxProducts || 100,
        maxOrders: subscription?.maxOrders || 1000
      },
      isActive: true,
      isSuspended: false
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenant: company
      }
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating tenant'
    });
  }
});

// @desc    Update tenant
// @route   PUT /api/saas-admin/tenants/:id
// @access  Private (SaaS Admin only)
router.put('/:id', [
  verifySaasAdminForTenants,
  param('id').isMongoId().withMessage('Invalid tenant ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('contactInfo.phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('subscription.plan')
    .optional()
    .isIn(['trial', 'basic', 'professional', 'enterprise'])
    .withMessage('Invalid subscription plan'),
  body('subscription.maxUsers')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max users must be between 1 and 10000'),
  body('subscription.maxProducts')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Max products must be between 1 and 100000'),
  body('subscription.maxOrders')
    .optional()
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Max orders must be between 1 and 1000000'),
  handleValidationErrors
], async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update allowed fields
    const updateData = {};
    const allowedUpdates = [
      'name', 'contactInfo', 'businessInfo', 'subscription'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'subscription') {
          // Merge subscription updates
          updateData.subscription = {
            ...company.subscription.toObject(),
            ...req.body.subscription
          };

          // Handle dates if provided
          if (req.body.subscription.startDate) {
            updateData.subscription.startDate = new Date(req.body.subscription.startDate);
          }
          if (req.body.subscription.endDate) {
            updateData.subscription.endDate = new Date(req.body.subscription.endDate);
          }

          // If updating to active status but no end date provided, extend by 30 days
          if (updateData.subscription.status === 'active' && !updateData.subscription.endDate) {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 30);
            updateData.subscription.endDate = endDate;
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        tenant: updatedCompany
      }
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tenant'
    });
  }
});

// @desc    Activate/Deactivate tenant
// @route   PATCH /api/saas-admin/tenants/:id/activate
// @access  Private (SaaS Admin only)
router.patch('/:id/activate', [
  verifySaasAdminForTenants,
  param('id').isMongoId().withMessage('Invalid tenant ID'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update activation status
    company.isActive = isActive;
    
    if (!isActive) {
      // Deactivating - also suspend and add reason
      company.isSuspended = true;
      if (reason) {
        company.suspensionReason = reason;
        company.suspendedAt = new Date();
      }
    } else {
      // Activating - remove suspension
      company.isSuspended = false;
      company.suspensionReason = undefined;
      company.suspendedAt = undefined;
    }

    await company.save();

    // Also update all users in this tenant
    await User.updateMany(
      { company: company._id },
      { isActive: isActive }
    );

    res.json({
      success: true,
      message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        tenant: company
      }
    });
  } catch (error) {
    console.error('Activate/deactivate tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tenant status'
    });
  }
});

// @desc    Suspend/Unsuspend tenant (without deactivating)
// @route   PATCH /api/saas-admin/tenants/:id/suspend
// @access  Private (SaaS Admin only)
router.patch('/:id/suspend', [
  verifySaasAdminForTenants,
  param('id').isMongoId().withMessage('Invalid tenant ID'),
  body('isSuspended')
    .isBoolean()
    .withMessage('isSuspended must be a boolean value'),
  body('reason')
    .if(body('isSuspended').equals(true))
    .notEmpty()
    .withMessage('Reason is required when suspending'),
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { isSuspended, reason } = req.body;
    
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    company.isSuspended = isSuspended;
    
    if (isSuspended && reason) {
      company.suspensionReason = reason;
      company.suspendedAt = new Date();
    } else if (!isSuspended) {
      company.suspensionReason = undefined;
      company.suspendedAt = undefined;
    }

    await company.save();

    res.json({
      success: true,
      message: `Tenant ${isSuspended ? 'suspended' : 'unsuspended'} successfully`,
      data: {
        tenant: company
      }
    });
  } catch (error) {
    console.error('Suspend/unsuspend tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tenant suspension status'
    });
  }
});

// @desc    Delete tenant (soft delete)
// @route   DELETE /api/saas-admin/tenants/:id
// @access  Private (SaaS Admin only)
router.delete('/:id', [
  verifySaasAdminForTenants,
  param('id').isMongoId().withMessage('Invalid tenant ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Soft delete - just deactivate and suspend
    company.isActive = false;
    company.isSuspended = true;
    company.suspensionReason = 'Deleted by SaaS Admin';
    company.suspendedAt = new Date();

    await company.save();

    // Deactivate all users
    await User.updateMany(
      { company: company._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting tenant'
    });
  }
});

module.exports = router;