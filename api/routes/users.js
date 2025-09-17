const express = require('express');
const { body, param } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const { protect, authorize } = require('../middleware/auth');
const { 
  extractTenant, 
  extractTenantOptional,
  validateTenantAccess, 
  autoTenantFilter,
  checkSubscriptionLimit 
} = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'email', 'role', 'isActive', 'createdAt', 'lastLogin']),
  validateSearch(['name', 'email'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { isActive, subscriptionPlan, role } = req.query;

    // Build query with tenant filter
    let query = req.tenantFilter || {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (subscriptionPlan) query['subscription.plan'] = subscriptionPlan;
    if (role) query.role = role;

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenantOptional,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid user ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Apply tenant filter to user lookup (optional for super admins)
    const query = req.tenantFilter ? { _id: req.params.id, ...req.tenantFilter } : { _id: req.params.id };
    const user = await User.findOne(query).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee', 'viewer'])
    .withMessage('Invalid role'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, email, password, phone, address, role = 'employee', isActive = true } = req.body;

    // Check if user already exists within the tenant
    const existingUser = await User.findOne({ 
      email,
      tenantId: req.user.tenantId 
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email in your organization'
      });
    }

    // Get role permissions if role is provided
    let permissions = {};
    if (role) {
      const roleDoc = await Role.findOne({ 
        name: role.toUpperCase(),
        $or: [
          { tenantId: req.user.tenantId },
          { isSystem: true }
        ]
      });
      if (roleDoc) {
        permissions = roleDoc.permissions;
      }
    }

    // Create user with tenant information
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      role,
      isActive,
      permissions,
      tenantId: req.user.tenantId,
      company: req.user.company,
      isEmailVerified: true // Admin created users are automatically verified
    });

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating user'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', [
  protect,
  param('id').isMongoId().withMessage('Invalid user ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Prevent users from updating their own status
    if (req.params.id === req.user.id.toString()) {
      delete req.body.isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @desc    Delete user (deactivate)
// @route   DELETE /api/users/:id
// @access  Private
router.delete('/:id', [
  protect,
  param('id').isMongoId().withMessage('Invalid user ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Prevent user from deactivating themselves
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Deactivate instead of hard delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating user'
    });
  }
});

// @desc    Update user subscription
// @route   PUT /api/users/:id/subscription
// @access  Private
router.put('/:id/subscription', [
  protect,
  param('id').isMongoId().withMessage('Invalid user ID'),
  sanitizeInput,
  body('plan')
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Invalid subscription plan'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'cancelled', 'expired'])
    .withMessage('Invalid subscription status'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { plan, status, endDate } = req.body;

    const updateData = {
      'subscription.plan': plan
    };

    if (status) updateData['subscription.status'] = status;
    if (endDate) updateData['subscription.endDate'] = new Date(endDate);

    // Set start date if upgrading
    if (plan !== 'free') {
      updateData['subscription.startDate'] = new Date();
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating subscription'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
router.get('/meta/stats', [
  protect
], async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        userStats: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0
        },
        subscriptionStats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

module.exports = router;
