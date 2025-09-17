const express = require('express');
const mongoose = require('mongoose');
const { body, param } = require('express-validator');
const Route = require('../models/Route');
const Dealer = require('../models/Dealer');
const Order = require('../models/Order');
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

// @desc    Get all routes
// @route   GET /api/routes
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['code', 'name', 'city', 'state', 'status', 'dealerCount', 'createdAt']),
  validateSearch(['code', 'name', 'city', 'area'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, city, state, assignedTo } = req.query;

    // Build query with tenant isolation
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (status) query.status = status;
    if (city) query.city = city;
    if (state) query.state = state;
    if (assignedTo) query.assignedTo = assignedTo;

    // Execute query with pagination
    const routes = await Route.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Route.countDocuments(query);

    res.json({
      success: true,
      data: {
        routes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching routes'
    });
  }
});

// @desc    Get single route
// @route   GET /api/routes/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid route ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Get dealers in this route
    const dealers = await Dealer.find({ route: route._id, ...req.tenantFilter })
      .select('name businessName dealerCode financialInfo.currentBalance status')
      .populate('dealerGroup', 'name');

    res.json({
      success: true,
      data: { 
        route,
        dealers
      }
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching route'
    });
  }
});

// @desc    Create new route
// @route   POST /api/routes
// @access  Private (Admin, Manager)
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Route name must be between 1 and 100 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Route code can only contain uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Area name cannot exceed 100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City name cannot exceed 50 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State name cannot exceed 50 characters'),
  body('pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Please provide a valid 6-digit pincode'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('estimatedDeliveryTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Delivery time must be at least 1 hour'),
  body('deliveryDays')
    .optional()
    .isArray()
    .withMessage('Delivery days must be an array'),
  body('deliveryDays.*')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid delivery day'),
  handleValidationErrors
], async (req, res) => {
  try {
    const routeData = {
      ...req.body,
      ...req.tenantFilter,
      createdBy: req.user.id
    };

    const route = await Route.create(routeData);

    // Populate the created route
    await route.populate('assignedTo', 'name email');
    await route.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: { route }
    });
  } catch (error) {
    console.error('Create route error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Route code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating route'
    });
  }
});

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private (Admin, Manager)
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid route ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Route name must be between 1 and 100 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Route code can only contain uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Area name cannot exceed 100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City name cannot exceed 50 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State name cannot exceed 50 characters'),
  body('pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Please provide a valid 6-digit pincode'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
  body('estimatedDeliveryTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Delivery time must be at least 1 hour'),
  body('deliveryDays')
    .optional()
    .isArray()
    .withMessage('Delivery days must be an array'),
  body('deliveryDays.*')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid delivery day'),
  handleValidationErrors
], async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const route = await Route.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      message: 'Route updated successfully',
      data: { route }
    });
  } catch (error) {
    console.error('Update route error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Route code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating route'
    });
  }
});

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private (Admin, Manager)
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid route ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check if any dealers are assigned to this route
    const dealerCount = await Dealer.countDocuments({ route: route._id, ...req.tenantFilter });
    if (dealerCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete route. ${dealerCount} dealer(s) are assigned to this route.`
      });
    }

    await Route.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting route'
    });
  }
});

// @desc    Get route statistics
// @route   GET /api/routes/meta/stats
// @access  Private (Admin, Manager)
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const stats = await Route.aggregate([
      { $match: req.tenantFilter },
      {
        $group: {
          _id: null,
          totalRoutes: { $sum: 1 },
          activeRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          totalDealers: { $sum: '$dealerCount' },
          avgDeliveryTime: { $avg: '$estimatedDeliveryTime' }
        }
      }
    ]);

    const statusStats = await Route.aggregate([
      { $match: req.tenantFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          dealerCount: { $sum: '$dealerCount' }
        }
      }
    ]);

    const cityStats = await Route.aggregate([
      { $match: req.tenantFilter },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          dealerCount: { $sum: '$dealerCount' }
        }
      },
      { $sort: { dealerCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        routeStats: stats[0] || {
          totalRoutes: 0,
          activeRoutes: 0,
          inactiveRoutes: 0,
          totalDealers: 0,
          avgDeliveryTime: 0
        },
        statusStats,
        cityStats
      }
    });
  } catch (error) {
    console.error('Get route stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching route statistics'
    });
  }
});

// @desc    Get route-wise outstanding invoice metrics
// @route   GET /api/routes/meta/outstanding-metrics
// @access  Private (Admin, Manager)
router.get('/meta/outstanding-metrics', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validateDateRange
], async (req, res) => {
  try {
    const { startDate, endDate, routeId } = req.query;
    
    console.log('Route metrics request params:', { startDate, endDate, routeId, tenantId: req.tenant.id });
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (req.dateQuery) {
      dateFilter.createdAt = req.dateQuery;
    }
    
    console.log('Date filter:', dateFilter);

    // Build aggregation pipeline
    let pipeline = [
      // Match dealer orders only with tenant filter
      {
        $match: {
          dealer: { $exists: true },
          ...req.tenantFilter,
          ...dateFilter
        }
      },
      // Lookup dealer info to get route
      {
        $lookup: {
          from: 'dealers',
          localField: 'dealer',
          foreignField: '_id',
          as: 'dealerInfo',
          pipeline: [
            { $match: req.tenantFilter }
          ]
        }
      },
      // Unwind dealer info
      {
        $unwind: '$dealerInfo'
      },
      // Lookup route info
      {
        $lookup: {
          from: 'routes',
          localField: 'dealerInfo.route',
          foreignField: '_id',
          as: 'routeInfo',
          pipeline: [
            { $match: req.tenantFilter }
          ]
        }
      },
      // Unwind route info (some dealers might not have routes)
      {
        $unwind: {
          path: '$routeInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Only include orders from dealers that have routes assigned
      {
        $match: {
          'routeInfo._id': { $exists: true, $ne: null }
        }
      }
    ];

    // Add route filter if specified
    if (routeId) {
      pipeline.push({
        $match: {
          'dealerInfo.route': new mongoose.Types.ObjectId(routeId)
        }
      });
    }

    // Add grouping and metrics calculation
    pipeline.push(
      {
        $group: {
          _id: {
            routeId: '$routeInfo._id',
            routeCode: '$routeInfo.code',
            routeName: '$routeInfo.name'
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
          outstandingAmount: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: [{ $ifNull: ['$payment.dueAmount', '$pricing.total'] }, 0] },
                  { $ne: ['$status', 'cancelled'] },
                  { $ne: ['$status', 'refunded'] }
                ]},
                { $ifNull: ['$payment.dueAmount', { $subtract: [{ $ifNull: ['$pricing.total', 0] }, { $ifNull: ['$payment.paidAmount', 0] }] }] },
                0
              ]
            }
          },
          paidAmount: { $sum: { $ifNull: ['$payment.paidAmount', 0] } },
          outstandingOrders: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: [{ $ifNull: ['$payment.dueAmount', { $subtract: [{ $ifNull: ['$pricing.total', 0] }, { $ifNull: ['$payment.paidAmount', 0] }] }] }, 0] },
                  { $ne: ['$status', 'cancelled'] },
                  { $ne: ['$status', 'refunded'] }
                ]},
                1,
                0
              ]
            }
          },
          paidOrders: {
            $sum: {
              $cond: [
                { $and: [
                  { $lte: [{ $ifNull: ['$payment.dueAmount', { $subtract: [{ $ifNull: ['$pricing.total', 0] }, { $ifNull: ['$payment.paidAmount', 0] }] }] }, 0] },
                  { $ne: ['$status', 'cancelled'] },
                  { $ne: ['$status', 'refunded'] }
                ]},
                1,
                0
              ]
            }
          },
          uniqueDealers: { $addToSet: '$dealer' },
          avgOrderValue: { $avg: '$pricing.total' },
          minOrderValue: { $min: '$pricing.total' },
          maxOrderValue: { $max: '$pricing.total' }
        }
      },
      {
        $project: {
          _id: 0,
          route: {
            id: '$_id.routeId',
            code: '$_id.routeCode',
            name: '$_id.routeName'
          },
          metrics: {
            totalOrders: '$totalOrders',
            totalAmount: '$totalAmount',
            outstandingAmount: '$outstandingAmount',
            paidAmount: '$paidAmount',
            outstandingOrders: '$outstandingOrders',
            paidOrders: '$paidOrders',
            dealerCount: { $size: '$uniqueDealers' },
            avgOrderValue: '$avgOrderValue',
            minOrderValue: '$minOrderValue',
            maxOrderValue: '$maxOrderValue',
            outstandingPercentage: {
              $cond: [
                { $gt: ['$totalAmount', 0] },
                { $multiply: [{ $divide: ['$outstandingAmount', '$totalAmount'] }, 100] },
                0
              ]
            },
            collectionEfficiency: {
              $cond: [
                { $gt: ['$totalAmount', 0] },
                { $multiply: [{ $divide: ['$paidAmount', '$totalAmount'] }, 100] },
                0
              ]
            }
          }
        }
      },
      { $sort: { 'metrics.outstandingAmount': -1 } }
    );

    console.log('Executing aggregation pipeline for route metrics...');
    const routeMetrics = await Order.aggregate(pipeline);
    console.log(`Found ${routeMetrics.length} route metrics results`);

    // Get overall summary
    const summary = routeMetrics.reduce(
      (acc, route) => {
        acc.totalRoutes += 1;
        acc.totalOrders += route.metrics.totalOrders;
        acc.totalAmount += route.metrics.totalAmount;
        acc.outstandingAmount += route.metrics.outstandingAmount;
        acc.paidAmount += route.metrics.paidAmount;
        acc.dealerCount += route.metrics.dealerCount;
        return acc;
      },
      {
        totalRoutes: 0,
        totalOrders: 0,
        totalAmount: 0,
        outstandingAmount: 0,
        paidAmount: 0,
        dealerCount: 0
      }
    );

    // Calculate summary percentages
    if (summary.totalAmount > 0) {
      summary.outstandingPercentage = (summary.outstandingAmount / summary.totalAmount) * 100;
      summary.collectionEfficiency = (summary.paidAmount / summary.totalAmount) * 100;
    } else {
      summary.outstandingPercentage = 0;
      summary.collectionEfficiency = 0;
    }

    console.log('Route metrics summary:', summary);

    res.json({
      success: true,
      data: {
        summary,
        routeMetrics: routeMetrics || [],
        totalRoutes: routeMetrics ? routeMetrics.length : 0
      }
    });
  } catch (error) {
    console.error('Get route outstanding metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching route metrics'
    });
  }
});

// @desc    Update dealer count for a route
// @route   PUT /api/routes/:id/update-dealer-count
// @access  Private (Admin, Manager)
router.put('/:id/update-dealer-count', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid route ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const dealerCount = await route.updateDealerCount();

    res.json({
      success: true,
      message: 'Dealer count updated successfully',
      data: { 
        routeId: route._id,
        dealerCount 
      }
    });
  } catch (error) {
    console.error('Update dealer count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating dealer count'
    });
  }
});

module.exports = router;