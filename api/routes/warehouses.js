const express = require('express');
const { body, param } = require('express-validator');
const Warehouse = require('../models/Warehouse');
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
 
// @desc    Get all warehouses
// @route   GET /api/warehouses 
// @access  Private 
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'code', 'status', 'address.city', 'createdAt']),
  validateSearch(['name', 'code'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, city, state } = req.query;

    // Build query with tenant isolation
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (status) query.status = status;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (state) query['address.state'] = new RegExp(state, 'i');

    // Execute query with pagination
    const warehouses = await Warehouse.find(query)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Warehouse.countDocuments(query);

    res.json({
      success: true,
      data: {
        warehouses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching warehouses'
    });
  } 
});

// @desc    Get active warehouses (for dropdowns)
// @route   GET /api/warehouses/active
// @access  Private
router.get('/active', [protect, extractTenant, validateTenantAccess], async (req, res) => {
  try {
    // Get active warehouses with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { status: 'active', tenantId: req.tenant.id }
      : { status: 'active' };
    
    const warehouses = await Warehouse.find(query)
      .select('_id name code description address.city address.state')
      .sort('name');
    
    res.json({
      success: true,
      data: {
        warehouses: warehouses.map(warehouse => ({
          id: warehouse._id,
          name: warehouse.name,
          code: warehouse.code,
          description: warehouse.description,
          location: `${warehouse.address.city || ''}, ${warehouse.address.state || ''}`.replace(/^,\s*|,\s*$/g, '')
        }))
      }
    });
  } catch (error) {
    console.error('Get active warehouses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active warehouses'
    });
  }
});

// @desc    Get single warehouse
// @route   GET /api/warehouses/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid warehouse ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };

    const warehouse = await Warehouse.findOne(query)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      data: { warehouse }
    });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching warehouse'
    });
  }
});

// @desc    Create new warehouse
// @route   POST /api/warehouses
// @access  Private (Admin, Manager)
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Warehouse name is required')
    .isLength({ max: 100 })
    .withMessage('Warehouse name cannot exceed 100 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Warehouse code is required')
    .isLength({ max: 20 })
    .withMessage('Warehouse code cannot exceed 20 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Warehouse code can only contain uppercase letters, numbers, underscores, and dashes'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ZIP code cannot exceed 20 characters'),
  body('contact.phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('capacity.maxItems')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum items must be a non-negative number'),
  body('capacity.maxWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum weight must be a non-negative number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const warehouseData = {
      ...req.body,
      createdBy: req.user.id,
      tenantId: req.tenant.id
    };

    // Convert code to uppercase
    if (warehouseData.code) {
      warehouseData.code = warehouseData.code.toUpperCase();
    }

    const warehouse = await Warehouse.create(warehouseData);

    // Populate the created warehouse
    await warehouse.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: { warehouse }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'name' ? 'Warehouse name already exists' : 'Warehouse code already exists';
      return res.status(400).json({
        success: false,
        message
      });
    }

    console.error('Create warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating warehouse'
    });
  }
});

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private (Admin, Manager)
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid warehouse ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Warehouse name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Warehouse name cannot exceed 100 characters'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Warehouse code cannot be empty')
    .isLength({ max: 20 })
    .withMessage('Warehouse code cannot exceed 20 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Warehouse code can only contain uppercase letters, numbers, underscores, and dashes'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance', 'closed'])
    .withMessage('Invalid status'),
  handleValidationErrors
], async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastUpdatedBy: req.user.id
    };

    // Convert code to uppercase if provided
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };

    const warehouse = await Warehouse.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: { warehouse }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'name' ? 'Warehouse name already exists' : 'Warehouse code already exists';
      return res.status(400).json({
        success: false,
        message
      });
    }

    console.error('Update warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating warehouse'
    });
  }
});

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid warehouse ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Check if warehouse is being used in inventory
    const Inventory = require('../models/Inventory');
    const inventoryQuery = req.user.role !== 'super_admin'
      ? { 'location.warehouse': { $in: [req.params.id] }, tenantId: req.tenant.id }
      : { 'location.warehouse': { $in: [req.params.id] } };
    
    const inventoryCount = await Inventory.countDocuments(inventoryQuery);

    if (inventoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete warehouse. It is being used by ${inventoryCount} inventory item(s).`
      });
    }

    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };

    const warehouse = await Warehouse.findOneAndDelete(query);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      message: 'Warehouse deleted successfully'
    });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting warehouse'
    });
  }
});

// @desc    Get warehouse statistics
// @route   GET /api/warehouses/meta/stats
// @access  Private (Admin, Manager)
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    // Build match stage for tenant isolation
    const matchStage = req.user.role !== 'super_admin' 
      ? { $match: { tenantId: req.tenant.id } }
      : { $match: {} };

    const stats = await Warehouse.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalWarehouses: { $sum: 1 },
          activeWarehouses: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveWarehouses: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          maintenanceWarehouses: {
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
          }
        }
      }
    ]);

    const statusStats = await Warehouse.aggregate([
      matchStage,
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const locationStats = await Warehouse.aggregate([
      matchStage,
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 },
          warehouses: { $push: { name: '$name', city: '$address.city' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        warehouseStats: stats[0] || {
          totalWarehouses: 0,
          activeWarehouses: 0,
          inactiveWarehouses: 0,
          maintenanceWarehouses: 0
        },
        statusStats,
        locationStats
      }
    });
  } catch (error) {
    console.error('Get warehouse stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching warehouse statistics'
    });
  }
});

module.exports = router;