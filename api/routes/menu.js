const express = require('express');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess } = require('../middleware/tenant');
const { getMenuForUser, getFleetMenu, menuConfig } = require('../config/menu');
const Fleet = require('../models/Fleet');
const FleetMaintenance = require('../models/FleetMaintenance');

const router = express.Router();

// @desc    Get navigation menu for current user
// @route   GET /api/menu
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess
], async (req, res) => {
  try {
    // Get menu based on user permissions
    const menu = getMenuForUser(req.user);

    res.json({
      success: true,
      data: { menu }
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching menu'
    });
  }
});

// @desc    Get fleet-specific menu with dynamic counts
// @route   GET /api/menu/fleet
// @access  Private
router.get('/fleet', [
  protect,
  extractTenant,
  validateTenantAccess
], async (req, res) => {
  try {
    // Get fleet menu items
    const fleetMenu = getFleetMenu(req.user);
    
    if (fleetMenu.length === 0) {
      return res.json({
        success: true,
        data: { menu: [], counts: {} }
      });
    }

    // Get dynamic counts for fleet-related items
    const tenantFilter = { tenantId: req.tenant.id };
    
    const [
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      upcomingMaintenance,
      overdueMaintenance,
      expiringDocuments
    ] = await Promise.all([
      Fleet.countDocuments(tenantFilter),
      Fleet.countDocuments({ ...tenantFilter, status: 'active' }),
      Fleet.countDocuments({ ...tenantFilter, status: 'maintenance' }),
      FleetMaintenance.countDocuments({
        ...tenantFilter,
        status: { $in: ['scheduled', 'in_progress'] },
        scheduledDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      }),
      FleetMaintenance.countDocuments({
        ...tenantFilter,
        status: { $nin: ['completed', 'cancelled'] },
        scheduledDate: { $lt: new Date() }
      }),
      Fleet.countDocuments({
        ...tenantFilter,
        $or: [
          { 'insurance.expiryDate': { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
          { 'pollution.expiryDate': { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
          { 'fitness.expiryDate': { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
          { 'permit.expiryDate': { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
        ]
      })
    ]);

    // Add counts to menu items
    const enhancedMenu = fleetMenu.map(menuItem => {
      if (menuItem.subMenu) {
        menuItem.subMenu = menuItem.subMenu.map(subItem => {
          let badge = null;
          
          switch (subItem.id) {
            case 'fleet-maintenance':
              if (upcomingMaintenance > 0) {
                badge = { count: upcomingMaintenance, type: 'info', title: 'Upcoming maintenance' };
              }
              if (overdueMaintenance > 0) {
                badge = { count: overdueMaintenance, type: 'danger', title: 'Overdue maintenance' };
              }
              break;
            case 'fleet-documents':
              if (expiringDocuments > 0) {
                badge = { count: expiringDocuments, type: 'warning', title: 'Expiring documents' };
              }
              break;
            case 'fleet-vehicles':
              if (maintenanceVehicles > 0) {
                badge = { count: maintenanceVehicles, type: 'warning', title: 'In maintenance' };
              }
              break;
          }
          
          return { ...subItem, badge };
        });
      }
      
      return menuItem;
    });

    const counts = {
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      upcomingMaintenance,
      overdueMaintenance,
      expiringDocuments
    };

    res.json({
      success: true,
      data: { 
        menu: enhancedMenu,
        counts
      }
    });
  } catch (error) {
    console.error('Get fleet menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fleet menu'
    });
  }
});

// @desc    Get notification counts
// @route   GET /api/menu/notifications
// @access  Private
router.get('/notifications', [
  protect,
  extractTenant,
  validateTenantAccess
], async (req, res) => {
  try {
    const tenantFilter = { tenantId: req.tenant.id };
    
    // Get counts for various notifications
    const [
      maintenanceDue,
      documentsExpiring,
      lowStock,
      pendingOrders
    ] = await Promise.all([
      FleetMaintenance.countDocuments({
        ...tenantFilter,
        status: { $nin: ['completed', 'cancelled'] },
        scheduledDate: { $lt: new Date() }
      }),
      Fleet.countDocuments({
        ...tenantFilter,
        $or: [
          { 'insurance.expiryDate': { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
          { 'pollution.expiryDate': { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
          { 'fitness.expiryDate': { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
          { 'permit.expiryDate': { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }
        ]
      }),
      // Low stock would require checking inventory levels
      0, // Placeholder for low stock count
      // Pending orders would require checking orders
      0  // Placeholder for pending orders count
    ]);

    const notifications = [
      {
        id: 'maintenance-due',
        title: 'Maintenance Due',
        count: maintenanceDue,
        type: maintenanceDue > 0 ? 'danger' : 'info',
        route: '/fleet/maintenance?filter=overdue'
      },
      {
        id: 'documents-expiring',
        title: 'Documents Expiring Soon',
        count: documentsExpiring,
        type: documentsExpiring > 0 ? 'warning' : 'info',
        route: '/fleet/documents?filter=expiring'
      },
      {
        id: 'low-stock',
        title: 'Low Stock Items',
        count: lowStock,
        type: lowStock > 0 ? 'warning' : 'info',
        route: '/inventory?filter=low-stock'
      },
      {
        id: 'pending-orders',
        title: 'Pending Orders',
        count: pendingOrders,
        type: pendingOrders > 0 ? 'info' : 'success',
        route: '/orders?status=pending'
      }
    ].filter(notification => notification.count > 0);

    res.json({
      success: true,
      data: { 
        notifications,
        totalCount: notifications.reduce((sum, n) => sum + n.count, 0)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
});

// @desc    Get complete menu configuration (for development/debugging)
// @route   GET /api/menu/config
// @access  Private (Admin only)
router.get('/config', [
  protect
], async (req, res) => {
  try {
    // Only allow super admin to see full config
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin required.'
      });
    }

    res.json({
      success: true,
      data: { menuConfig }
    });
  } catch (error) {
    console.error('Get menu config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching menu configuration'
    });
  }
});

module.exports = router;