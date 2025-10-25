/**
 * Application Menu Configuration
 * Defines the navigation structure with permissions and routes
 */

const menuConfig = {
  // Main navigation menu items
  mainMenu: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      permissions: ['read'],
      order: 1
    },
    {
      id: 'orders',
      title: 'Orders',
      icon: 'shopping-cart',
      route: '/orders',
      permissions: ['orders.read'],
      order: 2,
      subMenu: [
        {
          id: 'orders-list',
          title: 'All Orders',
          route: '/orders',
          permissions: ['orders.read']
        },
        {
          id: 'orders-create',
          title: 'Create Order',
          route: '/orders/create',
          permissions: ['orders.create']
        },
        {
          id: 'orders-pending',
          title: 'Pending Orders',
          route: '/orders?status=pending',
          permissions: ['orders.read']
        },
        {
          id: 'orders-delivered',
          title: 'Delivered Orders',
          route: '/orders?status=delivered',
          permissions: ['orders.read']
        }
      ]
    },
    {
      id: 'customers',
      title: 'Customers',
      icon: 'users',
      route: '/customers',
      permissions: ['customers.read'],
      order: 3,
      subMenu: [
        {
          id: 'customers-list',
          title: 'All Customers',
          route: '/customers',
          permissions: ['customers.read']
        },
        {
          id: 'customers-create',
          title: 'Add Customer',
          route: '/customers/create',
          permissions: ['customers.create']
        },
        {
          id: 'customers-groups',
          title: 'Customer Groups',
          route: '/customers/groups',
          permissions: ['customers.read']
        }
      ]
    },
    {
      id: 'dealers',
      title: 'Dealers',
      icon: 'store',
      route: '/dealers',
      permissions: ['dealers.read'],
      order: 4,
      subMenu: [
        {
          id: 'dealers-list',
          title: 'All Dealers',
          route: '/dealers',
          permissions: ['dealers.read']
        },
        {
          id: 'dealers-create',
          title: 'Add Dealer',
          route: '/dealers/create',
          permissions: ['dealers.create']
        },
        {
          id: 'dealer-groups',
          title: 'Dealer Groups',
          route: '/dealer-groups',
          permissions: ['dealers.read']
        }
      ]
    },
    {
      id: 'products',
      title: 'Products',
      icon: 'package',
      route: '/products',
      permissions: ['products.read'],
      order: 5,
      subMenu: [
        {
          id: 'products-list',
          title: 'All Products',
          route: '/products',
          permissions: ['products.read']
        },
        {
          id: 'products-create',
          title: 'Add Product',
          route: '/products/create',
          permissions: ['products.create']
        },
        {
          id: 'categories',
          title: 'Categories',
          route: '/categories',
          permissions: ['products.read']
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventorysss',
      icon: 'archive',
      route: '/inventory',
      permissions: ['inventory.read'],
      order: 6,
      subMenu: [
        {
          id: 'inventory-overview',
          title: 'Overview',
          route: '/inventory',
          permissions: ['inventory.read']
        },
        {
          id: 'inventory-movements',
          title: 'Stock Movements',
          route: '/inventory/movements',
          permissions: ['inventory.read']
        },
        {
          id: 'warehouses',
          title: 'Warehouses',
          route: '/warehouses',
          permissions: ['inventory.read']
        },
        {
          id: 'suppliers',
          title: 'Suppliers',
          route: '/suppliers',
          permissions: ['suppliers.read']
        }
      ]
    },
    {
      id: 'fleet',
      title: 'Fleet Management',
      icon: 'truck',
      route: '/fleet',
      permissions: ['fleet.read'],
      order: 7,
      subMenu: [
        {
          id: 'fleet-vehicles',
          title: 'Vehicles',
          route: '/fleet',
          permissions: ['fleet.read'],
          description: 'Manage fleet vehicles, registrations, and documents'
        },
        {
          id: 'fleet-add-vehicle',
          title: 'Add Vehicle',
          route: '/fleet/add',
          permissions: ['fleet.create'],
          description: 'Register new vehicle to fleet'
        },
        {
          id: 'fleet-maintenance',
          title: 'Maintenance',
          route: '/fleet/maintenance',
          permissions: ['fleet.read'],
          description: 'Schedule and track vehicle maintenance'
        },
        {
          id: 'fleet-maintenance-schedule',
          title: 'Schedule Maintenance',
          route: '/fleet/maintenance/schedule',
          permissions: ['fleet.create'],
          description: 'Schedule new maintenance work'
        },
        {
          id: 'fleet-documents',
          title: 'Document Alerts',
          route: '/fleet/documents',
          permissions: ['fleet.read'],
          description: 'Track expiring documents and renewals'
        },
        {
          id: 'fleet-reports',
          title: 'Fleet Reports',
          route: '/fleet/reports',
          permissions: ['fleet.read'],
          description: 'Fleet analytics and cost reports'
        }
      ]
    },
    {
      id: 'routes',
      title: 'Routes',
      icon: 'map',
      route: '/routes',
      permissions: ['routes.read'],
      order: 8,
      subMenu: [
        {
          id: 'routes-list',
          title: 'All Routes',
          route: '/routes',
          permissions: ['routes.read']
        },
        {
          id: 'routes-create',
          title: 'Create Route',
          route: '/routes/create',
          permissions: ['routes.create']
        },
        {
          id: 'routes-optimization',
          title: 'Route Optimization',
          route: '/routes/optimization',
          permissions: ['routes.read']
        }
      ]
    },
    {
      id: 'billing',
      title: 'Billing',
      icon: 'credit-card',
      route: '/billing',
      permissions: ['billing.read'],
      order: 9,
      subMenu: [
        {
          id: 'billing-invoices',
          title: 'Invoices',
          route: '/billing/invoices',
          permissions: ['billing.read']
        },
        {
          id: 'billing-payments',
          title: 'Payments',
          route: '/billing/payments',
          permissions: ['billing.read']
        },
        {
          id: 'billing-reports',
          title: 'Financial Reports',
          route: '/billing/reports',
          permissions: ['billing.read']
        }
      ]
    },
    {
      id: 'procurement',
      title: 'Procurement',
      icon: 'shopping',
      route: '/procurement',
      permissions: ['procurement.read'],
      order: 6.5,
      subMenu: [
        {
          id: 'procurement-list',
          title: 'All Procurements',
          route: '/procurement',
          permissions: ['procurement.read'],
          description: 'View and manage all procurement orders'
        },
        {
          id: 'procurement-create',
          title: 'New Procurement',
          route: '/procurement/create',
          permissions: ['procurement.create'],
          description: 'Create new procurement order'
        },
        {
          id: 'procurement-pending',
          title: 'Pending Approvals',
          route: '/procurement?status=pending-approval',
          permissions: ['procurement.read'],
          description: 'View procurements awaiting approval'
        },
        {
          id: 'procurement-received',
          title: 'Received Orders',
          route: '/procurement?status=received',
          permissions: ['procurement.read'],
          description: 'View received procurement orders'
        },
        {
          id: 'procurement-suppliers',
          title: 'Supplier Management',
          route: '/suppliers',
          permissions: ['suppliers.read'],
          description: 'Manage suppliers for procurement'
        },
        {
          id: 'procurement-analytics',
          title: 'Procurement Analytics',
          route: '/procurement/analytics',
          permissions: ['procurement.read'],
          description: 'View procurement performance and analytics'
        }
      ]
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'bar-chart',
      route: '/reports',
      permissions: ['reports.read'],
      order: 10,
      subMenu: [
        {
          id: 'reports-sales',
          title: 'Sales Reports',
          route: '/reports/sales',
          permissions: ['reports.read']
        },
        {
          id: 'reports-inventory',
          title: 'Inventory Reports',
          route: '/reports/inventory',
          permissions: ['reports.read']
        },
        {
          id: 'reports-fleet',
          title: 'Fleet Reports',
          route: '/reports/fleet',
          permissions: ['fleet.read']
        },
        {
          id: 'reports-financial',
          title: 'Financial Reports',
          route: '/reports/financial',
          permissions: ['billing.read']
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings',
      route: '/settings',
      permissions: ['settings.read'],
      order: 11,
      subMenu: [
        {
          id: 'settings-company',
          title: 'Company Settings',
          route: '/settings/company',
          permissions: ['settings.update']
        },
        {
          id: 'settings-users',
          title: 'Users & Roles',
          route: '/settings/users',
          permissions: ['users.read']
        },
        {
          id: 'settings-roles',
          title: 'Roles & Permissions',
          route: '/settings/roles',
          permissions: ['users.read']
        },
        {
          id: 'settings-integrations',
          title: 'Integrations',
          route: '/settings/integrations',
          permissions: ['settings.update']
        }
      ]
    }
  ],

  // Quick actions for dashboard or floating action buttons
  quickActions: [
    {
      id: 'create-order',
      title: 'New Order',
      icon: 'plus-circle',
      route: '/orders/create',
      permissions: ['orders.create'],
      color: 'primary'
    },
    {
      id: 'add-customer',
      title: 'Add Customer',
      icon: 'user-plus',
      route: '/customers/create',
      permissions: ['customers.create'],
      color: 'success'
    },
    {
      id: 'schedule-maintenance',
      title: 'Schedule Maintenance',
      icon: 'tool',
      route: '/fleet/maintenance/schedule',
      permissions: ['fleet.create'],
      color: 'warning'
    },
    {
      id: 'add-vehicle',
      title: 'Add Vehicle',
      icon: 'truck',
      route: '/fleet/add',
      permissions: ['fleet.create'],
      color: 'info'
    }
  ],

  // Notification types for alerts
  notifications: [
    {
      id: 'maintenance-due',
      title: 'Maintenance Due',
      icon: 'wrench',
      route: '/fleet/maintenance?filter=due',
      permissions: ['fleet.read'],
      type: 'warning'
    },
    {
      id: 'documents-expiring',
      title: 'Documents Expiring',
      icon: 'file-text',
      route: '/fleet/documents?filter=expiring',
      permissions: ['fleet.read'],
      type: 'danger'
    },
    {
      id: 'low-stock',
      title: 'Low Stock Alert',
      icon: 'alert-triangle',
      route: '/inventory?filter=low-stock',
      permissions: ['inventory.read'],
      type: 'warning'
    },
    {
      id: 'pending-orders',
      title: 'Pending Orders',
      icon: 'clock',
      route: '/orders?status=pending',
      permissions: ['orders.read'],
      type: 'info'
    }
  ]
};

/**
 * Filter menu items based on user permissions
 * @param {Object} user - User object with role and permissions
 * @param {Array} menuItems - Menu items to filter
 * @returns {Array} Filtered menu items
 */
function filterMenuByPermissions(user, menuItems = menuConfig.mainMenu) {
  if (!user || !user.permissions) return [];

  const userPermissions = Array.isArray(user.permissions) 
    ? user.permissions 
    : Object.keys(user.permissions || {});

  return menuItems.filter(item => {
    // Check if user has required permissions for this menu item
    const hasPermission = item.permissions.some(permission => 
      userPermissions.includes(permission) || 
      userPermissions.includes('*') ||
      user.role === 'super_admin'
    );

    if (!hasPermission) return false;

    // Filter submenu items if they exist
    if (item.subMenu) {
      item.subMenu = item.subMenu.filter(subItem => {
        return subItem.permissions.some(permission => 
          userPermissions.includes(permission) || 
          userPermissions.includes('*') ||
          user.role === 'super_admin'
        );
      });
    }

    return true;
  }).sort((a, b) => a.order - b.order);
}

/**
 * Get menu structure for a specific user
 * @param {Object} user - User object
 * @returns {Object} Filtered menu configuration
 */
function getMenuForUser(user) {
  return {
    mainMenu: filterMenuByPermissions(user, menuConfig.mainMenu),
    quickActions: filterMenuByPermissions(user, menuConfig.quickActions),
    notifications: filterMenuByPermissions(user, menuConfig.notifications)
  };
}

/**
 * Get fleet-specific menu items
 * @param {Object} user - User object
 * @returns {Array} Fleet menu items
 */
function getFleetMenu(user) {
  const fleetMenuItem = menuConfig.mainMenu.find(item => item.id === 'fleet');
  if (!fleetMenuItem) return [];

  return filterMenuByPermissions(user, [fleetMenuItem]);
}

module.exports = {
  menuConfig,
  filterMenuByPermissions,
  getMenuForUser,
  getFleetMenu
};