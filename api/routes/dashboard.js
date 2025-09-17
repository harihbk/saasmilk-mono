const express = require('express');
const Order = require('../models/Order');
const Dealer = require('../models/Dealer');
const Route = require('../models/Route');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');

const router = express.Router();

// @desc    Get dealer-wise outstanding amounts for chart
// @route   GET /api/dashboard/dealer-outstanding
// @access  Private
router.get('/dealer-outstanding', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          dealer: { $exists: true },
          'payment.status': { $in: ['pending', 'processing'] },
          status: { $nin: ['cancelled', 'refunded'] },
          tenantId: req.tenant.id
        }
      },
      {
        $lookup: {
          from: 'dealers',
          localField: 'dealer',
          foreignField: '_id',
          as: 'dealerInfo',
          pipeline: [
            { $match: { tenantId: req.tenant.id } }
          ]
        }
      },
      {
        $unwind: '$dealerInfo'
      },
      {
        $group: {
          _id: {
            dealerId: '$dealerInfo._id',
            dealerName: '$dealerInfo.name',
            dealerCode: '$dealerInfo.dealerCode'
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
          outstandingAmount: {
            $sum: { $ifNull: ['$payment.dueAmount', 0] }
          }
        }
      },
      {
        $match: {
          outstandingAmount: { $gt: 0 }
        }
      },
      {
        $sort: { outstandingAmount: -1 }
      },
      {
        $limit: 10 // Top 10 dealers with highest outstanding
      }
    ];

    const dealerOutstanding = await Order.aggregate(pipeline);

    // Format data for chart
    const chartData = dealerOutstanding.map(item => ({
      dealerId: item._id.dealerId,
      dealerName: item._id.dealerName,
      dealerCode: item._id.dealerCode,
      totalOrders: item.totalOrders,
      totalAmount: parseFloat(item.totalAmount.toFixed(2)),
      outstandingAmount: parseFloat(item.outstandingAmount.toFixed(2))
    }));

    res.json({
      success: true,
      data: chartData,
      summary: {
        totalDealers: chartData.length,
        totalOutstanding: chartData.reduce((sum, item) => sum + item.outstandingAmount, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching dealer outstanding data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dealer outstanding data'
    });
  }
});

// @desc    Get route-wise outstanding amounts for bar chart
// @route   GET /api/dashboard/route-outstanding
// @access  Private
router.get('/route-outstanding', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          dealer: { $exists: true },
          'payment.status': { $in: ['pending', 'processing'] },
          status: { $nin: ['cancelled', 'refunded'] },
          tenantId: req.tenant.id
        }
      },
      {
        $lookup: {
          from: 'dealers',
          localField: 'dealer',
          foreignField: '_id',
          as: 'dealerInfo',
          pipeline: [
            { $match: { tenantId: req.tenant.id } }
          ]
        }
      },
      {
        $unwind: '$dealerInfo'
      },
      {
        $lookup: {
          from: 'routes',
          localField: 'dealerInfo.route',
          foreignField: '_id',
          as: 'routeInfo',
          pipeline: [
            { $match: { tenantId: req.tenant.id } }
          ]
        }
      },
      {
        $unwind: {
          path: '$routeInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            routeId: '$routeInfo._id',
            routeName: { $ifNull: ['$routeInfo.name', 'No Route'] },
            routeCode: { $ifNull: ['$routeInfo.code', 'N/A'] }
          },
          totalOrders: { $sum: 1 },
          totalDealers: { $addToSet: '$dealerInfo._id' },
          totalAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
          outstandingAmount: {
            $sum: { $ifNull: ['$payment.dueAmount', 0] }
          }
        }
      },
      {
        $addFields: {
          dealerCount: { $size: '$totalDealers' }
        }
      },
      {
        $match: {
          outstandingAmount: { $gt: 0 }
        }
      },
      {
        $sort: { outstandingAmount: -1 }
      }
    ];

    const routeOutstanding = await Order.aggregate(pipeline);

    // Format data for chart
    const chartData = routeOutstanding.map(item => ({
      routeId: item._id.routeId,
      routeName: item._id.routeName,
      routeCode: item._id.routeCode,
      totalOrders: item.totalOrders,
      dealerCount: item.dealerCount,
      totalAmount: parseFloat(item.totalAmount.toFixed(2)),
      outstandingAmount: parseFloat(item.outstandingAmount.toFixed(2))
    }));

    res.json({
      success: true,
      data: chartData,
      summary: {
        totalRoutes: chartData.length,
        totalOutstanding: chartData.reduce((sum, item) => sum + item.outstandingAmount, 0),
        totalDealers: chartData.reduce((sum, item) => sum + item.dealerCount, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching route outstanding data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching route outstanding data'
    });
  }
});

// @desc    Get recent orders (non-overlapping)
// @route   GET /api/dashboard/recent-orders
// @access  Private
router.get('/recent-orders', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const orders = await Order.find({
      tenantId: req.tenant.id
    })
    .populate('dealer', 'name dealerCode')
    .populate('customer', 'personalInfo.firstName personalInfo.lastName')
    .populate('items.product', 'name sku')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    // Format orders for display
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      buyer: order.dealer ? 
        `${order.dealer.name} (${order.dealer.dealerCode})` :
        order.customer ? 
        `${order.customer.personalInfo.firstName} ${order.customer.personalInfo.lastName}` :
        'Unknown',
      itemCount: order.items.length,
      totalAmount: parseFloat(order.pricing.total.toFixed(2)),
      paymentMethod: order.payment.method,
      paymentStatus: order.payment.status,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent orders'
    });
  }
});

// @desc    Get dashboard summary stats
// @route   GET /api/dashboard/summary
// @access  Private
router.get('/summary', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const [orderStats, dealerStats] = await Promise.all([
      // Order statistics
      Order.aggregate([
        { $match: { tenantId: req.tenant.id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$pricing.total' },
            pendingOrders: {
              $sum: {
                $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0]
              }
            },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ['$payment.status', 'completed'] }, 1, 0]
              }
            },
            totalOutstanding: {
              $sum: {
                $cond: [
                  { $gt: ['$payment.dueAmount', 0] },
                  '$payment.dueAmount',
                  0
                ]
              }
            }
          }
        }
      ]),
      // Dealer statistics
      Dealer.countDocuments({ tenantId: req.tenant.id, status: 'active' })
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalAmount: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalOutstanding: 0
    };

    res.json({
      success: true,
      data: {
        orders: {
          total: stats.totalOrders,
          pending: stats.pendingOrders,
          completed: stats.completedOrders,
          totalAmount: parseFloat(stats.totalAmount.toFixed(2)),
          totalOutstanding: parseFloat(stats.totalOutstanding.toFixed(2))
        },
        dealers: {
          total: dealerStats
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary'
    });
  }
});

module.exports = router;