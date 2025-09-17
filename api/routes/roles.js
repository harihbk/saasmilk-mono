const express = require('express');
const { body, param } = require('express-validator');
const Role = require('../models/Role');
const { protect, authorize } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'displayName', 'isActive', 'createdAt']),
  validateSearch(['name', 'displayName', 'description'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { isActive, isSystem } = req.query;

    // Build query with tenant isolation (include system roles)
    let query = {
      $or: [
        { tenantId: req.tenant.id },
        { isSystem: true }
      ]
    };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isSystem !== undefined) query.isSystem = isSystem === 'true';

    // Execute query
    const roles = await Role.find(query)
      .populate('createdBy', 'name email')
      .sort(sort || { name: 1 })
      .limit(limit)
      .skip(skip);

    const total = await Role.countDocuments(query);

    res.json({
      success: true,
      data: {
        roles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching roles'
    });
  }
});

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid role ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Use tenant filter for role lookup (include system roles)
    const role = await Role.findOne({
      _id: req.params.id,
      $or: [
        { tenantId: req.tenant.id },
        { isSystem: true }
      ]
    }).populate('createdBy', 'name email');

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.json({
      success: true,
      data: { role }
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching role'
    });
  }
});

// @desc    Create new role
// @route   POST /api/roles
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      permissions = {},
      isActive = true,
      isSystem = false
    } = req.body;

    // Check if role already exists within tenant scope
    const roleName = name || displayName.toUpperCase().replace(/\s+/g, '_');
    const existingRole = await Role.findOne({ 
      name: roleName,
      $or: [
        { tenantId: req.tenant.id },
        { isSystem: true }
      ]
    });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Create role with tenant information
    const role = await Role.create({
      name: roleName,
      displayName,
      description,
      permissions,
      isActive,
      isSystem,
      tenantId: req.tenant.id,
      createdBy: req.user._id
    });

    // Populate the created role
    await role.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating role'
    });
  }
});

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid role ID'),
  sanitizeInput,
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Find role with tenant filter (tenant-specific roles only for updates)
    const role = await Role.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found or access denied'
      });
    }

    // Prevent modification of system roles
    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify system roles'
      });
    }

    // Allow full updates for custom tenant roles
    Object.assign(role, req.body);
    await role.save();

    // Populate the updated role
    await role.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: { role }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating role'
    });
  }
});

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid role ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Find role with tenant filter (tenant-specific roles only for deletion)
    const role = await Role.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found or access denied'
      });
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    // Check if any users are using this role within the tenant
    const User = require('../models/User');
    const usersWithRole = await User.countDocuments({ 
      role: role.name.toLowerCase(),
      tenantId: req.tenant.id
    });
    
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role`
      });
    }

    await Role.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting role'
    });
  }
});

// @desc    Initialize default roles
// @route   POST /api/roles/init
// @access  Private
router.post('/init', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const createdRoles = await Role.createDefaultRoles(req.tenant.id);
    
    res.json({
      success: true,
      message: `Initialized ${createdRoles.length} default roles`,
      data: { roles: createdRoles }
    });
  } catch (error) {
    console.error('Initialize roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while initializing roles'
    });
  }
});

// @desc    Get role statistics
// @route   GET /api/roles/meta/stats
// @access  Private
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => { 
  try {
    // Build tenant filter for roles (include system roles)
    const roleFilter = {
      $or: [
        { tenantId: req.tenant.id },
        { isSystem: true }
      ]
    };

    const totalRoles = await Role.countDocuments(roleFilter);
    const activeRoles = await Role.countDocuments({ ...roleFilter, isActive: true });
    const systemRoles = await Role.countDocuments({ ...roleFilter, isSystem: true });
    const customRoles = await Role.countDocuments({ ...roleFilter, isSystem: false });

    // Role usage stats within tenant
    const User = require('../models/User');
    const roleUsage = await User.aggregate([ 
      {
        $match: { tenantId: req.tenant.id }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        } 
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalRoles,
          activeRoles,
          systemRoles,
          customRoles
        },
        roleUsage: roleUsage.reduce((acc, item) => {
          acc[item._id || 'unassigned'] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get role stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching role statistics'
    });
  }
});

module.exports = router;