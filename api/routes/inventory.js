const express = require('express');
const { body, param } = require('express-validator');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
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

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['product', 'location.warehouse', 'stock.available', 'createdAt']),
  validateSearch(['location.warehouse'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { warehouse, lowStock, outOfStock } = req.query;

    // Build query with tenant isolation
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (warehouse) query['location.warehouse'] = warehouse;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock.available', '$thresholds.minimum'] };
    }
    if (outOfStock === 'true') {
      query['stock.available'] = 0;
    }

    // Execute query with pagination
    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku category brand')
      .populate('location.warehouse', 'name code description')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Inventory.countDocuments(query);

    res.json({
      success: true,
      data: {
        inventoryItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory'
    });
  }
});

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOne(query)
      .populate('product')
      .populate('location.warehouse', 'name code description')
      .populate('batches.supplier', 'companyInfo.name')
      .populate('movements.performedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory item'
    });
  }
});

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private (Admin, Manager)
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('location.warehouse')
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  body('stock.available')
    .isInt({ min: 0 })
    .withMessage('Available stock must be a non-negative integer'),
  body('thresholds.minimum')
    .isInt({ min: 0 })
    .withMessage('Minimum threshold must be a non-negative integer'),
  body('pricing.averageCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Average cost must be a positive number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Validate product exists with tenant isolation
    const productQuery = req.user.role !== 'super_admin' 
      ? { _id: inventoryData.product, tenantId: req.tenant.id }
      : { _id: inventoryData.product };
    
    const product = await Product.findOne(productQuery);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate warehouse exists with tenant isolation
    const Warehouse = require('../models/Warehouse');
    const warehouseQuery = req.user.role !== 'super_admin' 
      ? { _id: inventoryData.location.warehouse, tenantId: req.tenant.id }
      : { _id: inventoryData.location.warehouse };
    
    const warehouse = await Warehouse.findOne(warehouseQuery);
    if (!warehouse) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if inventory already exists for this product and location with tenant isolation
    let existingQuery = {
      product: inventoryData.product,
      'location.warehouse': inventoryData.location.warehouse
    };
    
    if (req.user.role !== 'super_admin') {
      existingQuery.tenantId = req.tenant.id;
    }
    
    const existingInventory = await Inventory.findOne(existingQuery);

    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: 'Inventory already exists for this product and location'
      });
    }

    const inventoryItem = await Inventory.create(inventoryData);

    // Populate the created inventory item
    await inventoryItem.populate('product', 'name sku category brand');
    await inventoryItem.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating inventory item'
    });
  }
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Admin, Manager)
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  sanitizeInput,
  body('thresholds.minimum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum threshold must be a non-negative integer'),
  body('thresholds.maximum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum threshold must be a non-negative integer'),
  body('pricing.averageCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Average cost must be a positive number'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOneAndUpdate(
      query,
      { ...req.body, lastUpdatedBy: req.user.id },
      { new: true, runValidators: true }
    )
      .populate('product', 'name sku category brand')
      .populate('createdBy', 'name email');

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating inventory item'
    });
  }
});

// @desc    Add stock movement
// @route   POST /api/inventory/:id/movements
// @access  Private
router.post('/:id/movements', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  sanitizeInput,
  body('type')
    .isIn(['in', 'out', 'transfer', 'adjustment', 'damage', 'expiry'])
    .withMessage('Invalid movement type'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
  body('batchNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Batch number cannot exceed 50 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { type, quantity, reason, batchNumber, reference, notes } = req.body;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOne(query);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Validate stock availability for outbound movements
    if (['out', 'damage', 'expiry'].includes(type) && inventoryItem.stock.available < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    await inventoryItem.addMovement({
      type,
      quantity,
      reason,
      batchNumber,
      reference,
      notes,
      performedBy: req.user.id
    });

    await inventoryItem.populate('product', 'name sku');
    await inventoryItem.populate('movements.performedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Stock movement added successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Add stock movement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding stock movement'
    });
  }
});

// @desc    Reserve stock
// @route   POST /api/inventory/:id/reserve
// @access  Private
router.post('/:id/reserve', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  sanitizeInput,
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { quantity } = req.body;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOne(query);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await inventoryItem.reserveStock(quantity, req.user.id);

    res.json({
      success: true,
      message: 'Stock reserved successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    if (error.message === 'Insufficient stock available for reservation') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Reserve stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reserving stock'
    });
  }
});

// @desc    Release reserved stock
// @route   POST /api/inventory/:id/release
// @access  Private
router.post('/:id/release', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  sanitizeInput,
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { quantity } = req.body;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOne(query);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await inventoryItem.releaseReservedStock(quantity, req.user.id);

    res.json({
      success: true,
      message: 'Reserved stock released successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    if (error.message === 'Insufficient reserved stock to release') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Release stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while releasing stock'
    });
  }
});

// @desc    Get inventory alerts
// @route   GET /api/inventory/alerts
// @access  Private (Admin, Manager)
router.get('/meta/alerts', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination
], async (req, res) => {
  try {
    const { page, limit, skip } = req.query;
    const { type, severity } = req.query;

    // Build query for active alerts with tenant isolation
    let query = { 
      'alerts.isActive': true,
      ...req.tenantFilter
    };

    if (type) query['alerts.type'] = type;
    if (severity) query['alerts.severity'] = severity;

    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku')
      .sort({ 'alerts.createdAt': -1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(query);

    res.json({
      success: true,
      data: {
        inventoryItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory alerts'
    });
  }
});

// @desc    Acknowledge alert
// @route   PUT /api/inventory/:id/alerts/:alertId/acknowledge
// @access  Private
router.put('/:id/alerts/:alertId/acknowledge', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  param('alertId').isMongoId().withMessage('Invalid alert ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOne(query);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await inventoryItem.acknowledgeAlert(req.params.alertId, req.user.id);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while acknowledging alert'
    });
  }
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin, Manager)
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOneAndDelete(query);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item deleted successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting inventory item'
    });
  }
});

// @desc    Adjust inventory stock
// @route   PUT /api/inventory/:id/adjust
// @access  Private (Admin, Manager)
router.put('/:id/adjust', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  sanitizeInput,
  body('quantity')
    .isInt()
    .withMessage('Quantity must be an integer'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { quantity, reason, notes } = req.body;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const inventoryItem = await Inventory.findOne(query);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Add stock adjustment movement
    const movement = {
      type: 'adjustment',
      quantity: Math.abs(quantity),
      reason: reason || 'Stock adjustment',
      notes: notes,
      performedBy: req.user.id,
      timestamp: new Date()
    };

    inventoryItem.movements.push(movement);

    // Adjust stock levels
    if (quantity > 0) {
      inventoryItem.stock.available += quantity;
    } else {
      // Ensure we don't go below 0
      inventoryItem.stock.available = Math.max(0, inventoryItem.stock.available + quantity);
    }

    inventoryItem.lastUpdatedBy = req.user.id;
    await inventoryItem.save();

    await inventoryItem.populate('product', 'name sku');
    await inventoryItem.populate('movements.performedBy', 'name email');

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: { inventoryItem }
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adjusting stock'
    });
  }
});

// @desc    Get low stock alerts
// @route   GET /api/inventory/alerts/low-stock
// @access  Private
router.get('/alerts/low-stock', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination
], async (req, res) => {
  try {
    const { page, limit, skip } = req.query;

    // Build query for low stock items with tenant isolation
    let query = {
      ...req.tenantFilter,
      $expr: { $lte: ['$stock.available', '$thresholds.minimum'] }
    };

    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku category brand')
      .populate('location.warehouse', 'name code')
      .sort({ 'stock.available': 1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(query);

    res.json({
      success: true,
      data: {
        inventoryItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock alerts'
    });
  }
});

// @desc    Get expiring items alerts
// @route   GET /api/inventory/alerts/expiring
// @access  Private
router.get('/alerts/expiring', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination
], async (req, res) => {
  try {
    const { page, limit, skip } = req.query;
    const { days = 30 } = req.query; // Default to 30 days

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    // Build query for expiring items with tenant isolation
    let query = {
      ...req.tenantFilter,
      'batches.expiryDate': {
        $lte: expiryDate,
        $gte: new Date()
      }
    };

    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku category brand')
      .populate('location.warehouse', 'name code')
      .sort({ 'batches.expiryDate': 1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(query);

    res.json({
      success: true,
      data: {
        inventoryItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get expiring items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expiring items'
    });
  }
});

// @desc    Get inventory by product
// @route   GET /api/inventory/product/:productId
// @access  Private
router.get('/product/:productId', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('productId').isMongoId().withMessage('Invalid product ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    let query = {
      ...req.tenantFilter,
      product: req.params.productId
    };

    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku category brand')
      .populate('location.warehouse', 'name code description')
      .populate('createdBy', 'name email')
      .sort({ 'location.warehouse': 1 });

    if (inventoryItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No inventory found for this product'
      });
    }

    res.json({
      success: true,
      data: { inventoryItems }
    });
  } catch (error) {
    console.error('Get inventory by product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory by product'
    });
  }
});

// @desc    Get inventory by warehouse
// @route   GET /api/inventory/warehouse/:warehouseId
// @access  Private
router.get('/warehouse/:warehouseId', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('warehouseId').isMongoId().withMessage('Invalid warehouse ID'),
  validatePagination,
  handleValidationErrors
], async (req, res) => {
  try {
    const { page, limit, skip } = req.query;

    // Build query with tenant isolation
    let query = {
      ...req.tenantFilter,
      'location.warehouse': req.params.warehouseId
    };

    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku category brand')
      .populate('location.warehouse', 'name code description')
      .populate('createdBy', 'name email')
      .sort({ 'product.name': 1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(query);

    res.json({
      success: true,
      data: {
        inventoryItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inventory by warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory by warehouse'
    });
  }
});

// @desc    Get inventory statistics
// @route   GET /api/inventory/stats
// @access  Private
router.get('/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    // Build aggregation pipeline with tenant isolation
    const matchStage = { $match: req.tenantFilter };

    const [stats] = await Inventory.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$stock.available' },
          totalReserved: { $sum: '$stock.reserved' },
          totalValue: { $sum: { $multiply: ['$stock.available', '$pricing.averageCost'] } },
          lowStockItems: {
            $sum: {
              $cond: [
                { $lte: ['$stock.available', '$thresholds.minimum'] },
                1,
                0
              ]
            }
          },
          outOfStockItems: {
            $sum: {
              $cond: [
                { $eq: ['$stock.available', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get warehouse distribution
    const warehouseStats = await Inventory.aggregate([
      matchStage,
      {
        $group: {
          _id: '$location.warehouse',
          itemCount: { $sum: 1 },
          totalStock: { $sum: '$stock.available' }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      {
        $unwind: '$warehouse'
      },
      {
        $project: {
          _id: 1,
          warehouseName: '$warehouse.name',
          warehouseCode: '$warehouse.code',
          itemCount: 1,
          totalStock: 1
        }
      }
    ]);

    // Get category distribution
    const categoryStats = await Inventory.aggregate([
      matchStage,
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $group: {
          _id: '$productInfo.category',
          itemCount: { $sum: 1 },
          totalStock: { $sum: '$stock.available' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          _id: 1,
          categoryName: '$category.name',
          itemCount: 1,
          totalStock: 1
        }
      }
    ]);

    const result = {
      overview: stats || {
        totalItems: 0,
        totalStock: 0,
        totalReserved: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0
      },
      warehouseDistribution: warehouseStats,
      categoryDistribution: categoryStats
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory statistics'
    });
  }
});

module.exports = router;
