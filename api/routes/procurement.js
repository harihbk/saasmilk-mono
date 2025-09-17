const express = require('express');
const { body, param, query } = require('express-validator');
const Procurement = require('../models/Procurement');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { protect, authorize } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch,
  validateDateRange
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all procurements
// @route   GET /api/procurement
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['createdAt', 'procurementNumber', 'status', 'priority', 'delivery.expectedDate']),
  validateSearch(['procurementNumber', 'supplier.companyInfo.name']),
  validateDateRange
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, priority, procurementType, assignedTo, supplier, startDate, endDate } = req.query;

    // Build query with tenant filter
    let query = req.tenantFilter || {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (procurementType) query.procurementType = procurementType;
    if (assignedTo) query.assignedTo = assignedTo;
    if (supplier) query.supplier = supplier;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Add date range filter
    if (req.dateQuery) {
      query.createdAt = req.dateQuery;
    }

    // Execute query with pagination
    const procurements = await Procurement.find(query)
      .populate('supplier', 'companyInfo.name contactInfo.primaryContact status')
      .populate('items.product', 'name category unit')
      .populate('requestedBy assignedTo createdBy', 'name email')
      .populate('delivery.warehouse', 'name location')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Procurement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        procurements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get procurements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procurements',
      error: error.message
    });
  }
});

// @desc    Get single procurement
// @route   GET /api/procurement/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid procurement ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    }).populate([
      {
        path: 'supplier',
        select: 'companyInfo contactInfo addresses businessDetails performance'
      },
      {
        path: 'items.product',
        select: 'name category unit specifications'
      },
      {
        path: 'requestedBy assignedTo createdBy',
        select: 'name email role'
      },
      {
        path: 'delivery.warehouse',
        select: 'name location address'
      },
      {
        path: 'approvals.approver',
        select: 'name email role'
      },
      {
        path: 'qualityControl.inspector',
        select: 'name email'
      },
      {
        path: 'timeline.updatedBy',
        select: 'name'
      }
    ]);

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Procurement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: procurement
    });
  } catch (error) {
    console.error('Get procurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procurement',
      error: error.message
    });
  }
});

// @desc    Create new procurement
// @route   POST /api/procurement
// @access  Private
router.post('/', [
  protect,
  // authorize('procurement', 'create'), // Commented for testing
  extractTenant,
  validateTenantAccess,
  sanitizeInput,
  body('supplier')
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  body('procurementType')
    .optional()
    .isIn(['purchase-order', 'contract', 'spot-buy', 'emergency', 'bulk'])
    .withMessage('Invalid procurement type'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent', 'critical'])
    .withMessage('Invalid priority'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  body('delivery.expectedDate')
    .optional()
    .isISO8601()
    .withMessage('Expected delivery date must be a valid date'),
  body('delivery.warehouse')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Verify supplier belongs to the same tenant
    const supplier = await Supplier.findOne({
      _id: req.body.supplier,
      tenantId: req.tenant.id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found or access denied'
      });
    }

    // Verify all products belong to the same tenant
    const productIds = req.body.items.map(item => item.product);
    const products = await Product.find({
      _id: { $in: productIds },
      tenantId: req.tenant.id
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more products not found or access denied'
      });
    }

    // Verify warehouse if provided
    if (req.body.delivery?.warehouse) {
      const warehouse = await Warehouse.findOne({
        _id: req.body.delivery.warehouse,
        tenantId: req.tenant.id
      });

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found or access denied'
        });
      }
    }

    const procurementData = {
      ...req.body,
      requestedBy: req.user._id,
      createdBy: req.user._id,
      tenantId: req.tenant.id
    };

    const procurement = await Procurement.create(procurementData);

    // Populate the created procurement
    const populatedProcurement = await Procurement.findById(procurement._id)
      .populate([
        {
          path: 'supplier',
          select: 'companyInfo.name contactInfo.primaryContact'
        },
        {
          path: 'items.product',
          select: 'name category unit'
        },
        {
          path: 'requestedBy createdBy',
          select: 'name email'
        }
      ]);

    res.status(201).json({
      success: true,
      message: 'Procurement created successfully',
      data: populatedProcurement
    });
  } catch (error) {
    console.error('Create procurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating procurement',
      error: error.message
    });
  }
});

// @desc    Update procurement
// @route   PUT /api/procurement/:id
// @access  Private
router.put('/:id', [
  protect,
  // authorize('procurement', 'update'), // Commented for testing
  extractTenant,
  validateTenantAccess,
  sanitizeInput,
  param('id').isMongoId().withMessage('Invalid procurement ID'),
  body('status')
    .optional()
    .isIn([
      'draft', 'pending-approval', 'approved', 'sent-to-supplier', 
      'acknowledged', 'in-production', 'ready-to-ship', 'shipped',
      'partially-received', 'received', 'quality-check', 'completed',
      'cancelled', 'rejected'
    ])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent', 'critical'])
    .withMessage('Invalid priority'),
  handleValidationErrors
], async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Procurement not found'
      });
    }

    // Check if user can update this procurement
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'super_admin' ||
                     procurement.createdBy.toString() === req.user._id.toString() ||
                     procurement.assignedTo?.toString() === req.user._id.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this procurement'
      });
    }

    // Update procurement
    Object.keys(req.body).forEach(key => {
      procurement[key] = req.body[key];
    });

    await procurement.save();

    // Populate the updated procurement
    const updatedProcurement = await Procurement.findById(procurement._id)
      .populate([
        {
          path: 'supplier',
          select: 'companyInfo.name contactInfo.primaryContact'
        },
        {
          path: 'items.product',
          select: 'name category unit'
        },
        {
          path: 'requestedBy assignedTo createdBy',
          select: 'name email'
        }
      ]);

    res.status(200).json({
      success: true,
      message: 'Procurement updated successfully',
      data: updatedProcurement
    });
  } catch (error) {
    console.error('Update procurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating procurement',
      error: error.message
    });
  }
});

// @desc    Delete procurement
// @route   DELETE /api/procurement/:id
// @access  Private
router.delete('/:id', [
  protect,
  // authorize('procurement', 'delete'), // Commented for testing
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid procurement ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Procurement not found'
      });
    }

    // Check if procurement can be deleted (only draft or cancelled)
    if (!['draft', 'cancelled', 'rejected'].includes(procurement.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete procurement with status: ${procurement.status}`
      });
    }

    await procurement.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Procurement deleted successfully'
    });
  } catch (error) {
    console.error('Delete procurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting procurement',
      error: error.message
    });
  }
});

// @desc    Update received quantities
// @route   PUT /api/procurement/:id/receive
// @access  Private
router.put('/:id/receive', [
  protect,
  // authorize('procurement', 'update'), // Commented for testing
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid procurement ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required'),
  body('items.*.itemId')
    .isMongoId()
    .withMessage('Valid item ID is required'),
  body('items.*.receivedQuantity')
    .isInt({ min: 0 })
    .withMessage('Received quantity must be a non-negative number'),
  body('items.*.qualityGrade')
    .optional()
    .isIn(['A+', 'A', 'B+', 'B', 'C', 'Rejected'])
    .withMessage('Invalid quality grade'),
  handleValidationErrors
], async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Procurement not found'
      });
    }

    // Update received quantities
    req.body.items.forEach(updateItem => {
      const item = procurement.items.id(updateItem.itemId);
      if (item) {
        item.receivedQuantity = updateItem.receivedQuantity;
        if (updateItem.qualityGrade) {
          item.qualityGrade = updateItem.qualityGrade;
        }
      }
    });

    // Update status based on completion
    const totalQuantity = procurement.items.reduce((sum, item) => sum + item.quantity, 0);
    const receivedQuantity = procurement.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    const completionPercentage = Math.round((receivedQuantity / totalQuantity) * 100);

    if (completionPercentage === 100) {
      procurement.status = 'received';
    } else if (completionPercentage > 0) {
      procurement.status = 'partially-received';
    }

    await procurement.save();

    res.status(200).json({
      success: true,
      message: 'Received quantities updated successfully',
      data: {
        completionPercentage,
        status: procurement.status
      }
    });
  } catch (error) {
    console.error('Update received quantities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating received quantities',
      error: error.message
    });
  }
});

// @desc    Add approval to procurement
// @route   POST /api/procurement/:id/approvals
// @access  Private
router.post('/:id/approvals', [
  protect,
  // authorize('procurement', 'update'), // Commented for testing
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid procurement ID'),
  body('level')
    .isInt({ min: 1 })
    .withMessage('Approval level must be a positive integer'),
  body('approver')
    .isMongoId()
    .withMessage('Valid approver ID is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Procurement not found'
      });
    }

    procurement.approvals.push({
      level: req.body.level,
      approver: req.body.approver,
      status: 'pending'
    });

    await procurement.save();

    res.status(200).json({
      success: true,
      message: 'Approval added successfully',
      data: procurement.approvals
    });
  } catch (error) {
    console.error('Add approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding approval',
      error: error.message
    });
  }
});

// @desc    Process approval (approve/reject)
// @route   PUT /api/procurement/:id/approvals/:approvalId
// @access  Private
router.put('/:id/approvals/:approvalId', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid procurement ID'),
  param('approvalId').isMongoId().withMessage('Invalid approval ID'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  body('conditions')
    .optional()
    .isArray()
    .withMessage('Conditions must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const procurement = await Procurement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id
    });

    if (!procurement) {
      return res.status(404).json({
        success: false,
        message: 'Procurement not found'
      });
    }

    const approval = procurement.approvals.id(req.params.approvalId);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Check if user is the assigned approver
    if (approval.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this approval'
      });
    }

    // Process approval
    approval.status = req.body.status;
    approval.approvedAt = new Date();
    approval.notes = req.body.notes || '';
    approval.conditions = req.body.conditions || [];

    // Update overall status
    if (req.body.status === 'rejected') {
      procurement.status = 'rejected';
    } else if (req.body.status === 'approved') {
      const allApproved = procurement.approvals.every(a => a.status === 'approved');
      if (allApproved) {
        procurement.status = 'approved';
      }
    }

    await procurement.save();

    res.status(200).json({
      success: true,
      message: `Procurement ${req.body.status} successfully`,
      data: {
        approval,
        overallStatus: procurement.status
      }
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  }
});

// @desc    Get procurement statistics
// @route   GET /api/procurement/stats
// @access  Private
router.get('/stats/dashboard', [
  protect,
  extractTenant,
  validateTenantAccess
], async (req, res) => {
  try {
    const stats = await Procurement.aggregate([
      {
        $match: { tenantId: req.tenant.id }
      },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          priorityCounts: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 }
              }
            }
          ],
          totalValue: [
            {
              $group: {
                _id: null,
                total: { $sum: '$pricing.total' }
              }
            }
          ],
          monthlyTrend: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                value: { $sum: '$pricing.total' }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ],
          overdueProcurements: [
            {
              $match: {
                'delivery.expectedDate': { $lt: new Date() },
                status: { $nin: ['completed', 'cancelled', 'received'] }
              }
            },
            { $count: 'overdue' }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.status(200).json({
      success: true,
      data: {
        statusCounts: result.statusCounts,
        priorityCounts: result.priorityCounts,
        totalValue: result.totalValue[0]?.total || 0,
        monthlyTrend: result.monthlyTrend,
        overdueProcurements: result.overdueProcurements[0]?.overdue || 0
      }
    });
  } catch (error) {
    console.error('Get procurement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procurement statistics',
      error: error.message
    });
  }
});

module.exports = router;