const express = require('express');
const { body, param } = require('express-validator');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');
const { 
  extractTenant, 
  validateTenantAccess, 
  autoTenantFilter,
  checkSubscriptionLimit 
} = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch,
  validateDateRange
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['personalInfo.firstName', 'personalInfo.lastName', 'businessInfo.companyName', 'createdAt']),
  validateSearch(['personalInfo.firstName', 'personalInfo.lastName', 'personalInfo.email', 'businessInfo.companyName']),
  validateDateRange
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { type, status, assignedSalesperson } = req.query;

    // Build query with tenant filter
    let query = req.tenantFilter || {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (assignedSalesperson) query.assignedSalesperson = assignedSalesperson;

    // Add date range filter
    if (req.dateQuery) {
      query.createdAt = req.dateQuery;
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedSalesperson = req.user.id;
    }

    // Execute query with pagination
    const customers = await Customer.find(query)
      .populate('assignedSalesperson', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customers'
    });
  }
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid customer ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedSalesperson = req.user.id;
    }

    const customer = await Customer.findOne(query)
      .populate('assignedSalesperson', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: { customer }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer'
    });
  }
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('type')
    .isIn(['individual', 'business', 'distributor', 'retailer'])
    .withMessage('Invalid customer type'),
  body('personalInfo.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('personalInfo.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('personalInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('personalInfo.phone.primary')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid primary phone number'),
  body('personalInfo.phone.secondary')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid secondary phone number'),
  body('addresses')
    .isArray({ min: 1 })
    .withMessage('At least one address is required'),
  body('addresses.*.street')
    .notEmpty()
    .withMessage('Street address is required'),
  body('addresses.*.city')
    .notEmpty()
    .withMessage('City is required'),
  body('addresses.*.state')
    .notEmpty()
    .withMessage('State is required'),
  body('addresses.*.zipCode')
    .notEmpty()
    .withMessage('Zip code is required'),
  body('addresses.*.country')
    .notEmpty()
    .withMessage('Country is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Check if customer already exists with this email
    const existingCustomer = await Customer.findOne({ 
      'personalInfo.email': customerData.personalInfo.email,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    });
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer already exists with this email'
      });
    }

    const customer = await Customer.create(customerData);

    // Populate the created customer
    await customer.populate('assignedSalesperson', 'name email');
    await customer.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating customer'
    });
  }
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid customer ID'),
  sanitizeInput,
  body('personalInfo.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('personalInfo.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('personalInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('personalInfo.phone.primary')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid primary phone number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'blacklisted'])
    .withMessage('Invalid customer status'),
  handleValidationErrors
], async (req, res) => {
  try {
    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedSalesperson = req.user.id;
    }

    const customer = await Customer.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedSalesperson', 'name email')
      .populate('createdBy', 'name email');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating customer'
    });
  }
});

// @desc    Delete customer (deactivate)
// @route   DELETE /api/customers/:id
// @access  Private (Admin, Manager)
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid customer ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Deactivate instead of hard delete
    customer.status = 'inactive';
    await customer.save();

    res.json({
      success: true,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating customer'
    });
  }
});

// @desc    Add note to customer
// @route   POST /api/customers/:id/notes
// @access  Private
router.post('/:id/notes', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid customer ID'),
  sanitizeInput,
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note content must be between 1 and 1000 characters'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { content, isPrivate } = req.body;

    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedSalesperson = req.user.id;
    }

    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.notes.push({
      content,
      createdBy: req.user.id,
      isPrivate: isPrivate || false
    });

    await customer.save();

    await customer.populate('notes.createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Add customer note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @desc    Assign customer to salesperson
// @route   PUT /api/customers/:id/assign
// @access  Private (Admin, Manager)
router.put('/:id/assign', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid customer ID'),
  sanitizeInput,
  body('assignedSalesperson')
    .isMongoId()
    .withMessage('Invalid salesperson ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { assignedSalesperson } = req.body;

    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const customer = await Customer.findOneAndUpdate(
      query,
      { assignedSalesperson },
      { new: true }
    )
      .populate('assignedSalesperson', 'name email');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer assigned successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Assign customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning customer'
    });
  }
});

// @desc    Update customer loyalty points
// @route   PUT /api/customers/:id/loyalty
// @access  Private
router.put('/:id/loyalty', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid customer ID'),
  sanitizeInput,
  body('points')
    .isInt({ min: 0 })
    .withMessage('Points must be a positive integer'),
  body('action')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Action must be add, subtract, or set'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { points, action } = req.body;

    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update loyalty points based on action
    switch (action) {
      case 'add':
        await customer.addLoyaltyPoints(points);
        break;
      case 'subtract':
        customer.loyaltyProgram.points = Math.max(0, customer.loyaltyProgram.points - points);
        await customer.save();
        break;
      case 'set':
        customer.loyaltyProgram.points = points;
        await customer.save();
        break;
    }

    res.json({
      success: true,
      message: 'Loyalty points updated successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Update loyalty points error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating loyalty points'
    });
  }
});

// @desc    Get customer statistics
// @route   GET /api/customers/stats
// @access  Private (Admin, Manager)
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      ...(req.user.role !== 'super_admin' ? [{ $match: { tenantId: req.tenant.id } }] : []),
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          individualCustomers: {
            $sum: { $cond: [{ $eq: ['$type', 'individual'] }, 1, 0] }
          },
          businessCustomers: {
            $sum: { $cond: [{ $eq: ['$type', 'business'] }, 1, 0] }
          },
          totalSpent: { $sum: '$statistics.totalSpent' },
          averageOrderValue: { $avg: '$statistics.averageOrderValue' }
        }
      }
    ]);

    const typeStats = await Customer.aggregate([
      ...(req.user.role !== 'super_admin' ? [{ $match: { tenantId: req.tenant.id } }] : []),
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSpent: { $sum: '$statistics.totalSpent' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        customerStats: stats[0] || {
          totalCustomers: 0,
          activeCustomers: 0,
          individualCustomers: 0,
          businessCustomers: 0,
          totalSpent: 0,
          averageOrderValue: 0
        },
        typeStats
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer statistics'
    });
  }
});

module.exports = router;
