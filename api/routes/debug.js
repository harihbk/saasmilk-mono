const express = require('express');
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Dealer = require('../models/Dealer');
const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');
const Company = require('../models/Company');

const router = express.Router();

// @desc    Test SaaS admin login endpoint
// @route   POST /api/debug/test-saas-login
// @access  Public (for debugging only)
router.post('/test-saas-login', async (req, res) => {
  try {
    console.log('Debug test-saas-login called with:', req.body);
    console.log('Headers:', req.headers);
    
    res.json({
      success: true,
      message: 'Debug endpoint working',
      receivedData: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug test error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug test failed',
      error: error.message
    });
  }
});

// @desc    Debug tenant login issue
// @route   GET /api/debug/tenant-check/:tenantId
// @access  Public (for development only)
router.get('/tenant-check/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check if company exists
    const company = await Company.findOne({ tenantId: tenantId.toUpperCase() });
    
    // Check if users exist for this tenant
    const users = await User.find({ tenantId: tenantId.toUpperCase() }).select('name email role');
    
    res.json({
      success: true,
      data: {
        tenantId: tenantId.toUpperCase(),
        company: company ? {
          id: company._id,
          name: company.name,
          isActive: company.isActive,
          isSuspended: company.isSuspended,
          subscription: company.subscription
        } : null,
        users: users,
        userCount: users.length
      }
    });
  } catch (error) {
    console.error('Tenant check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking tenant',
      error: error.message
    });
  }
});

// @desc    Create test tenant and user
// @route   POST /api/debug/create-test-tenant
// @access  Public (for development only)
router.post('/create-test-tenant', async (req, res) => {
  try {
    const testTenantId = 'TEST01';
    const testCompanyName = 'Test Company';
    const testUserEmail = 'test@testcompany.com';
    const testPassword = 'password123';
    
    // Check if company already exists
    let company = await Company.findOne({ tenantId: testTenantId });
    
    if (!company) {
      // Create test company
      company = new Company({
        name: testCompanyName,
        slug: 'test-company',
        tenantId: testTenantId,
        contactInfo: {
          email: testUserEmail,
          phone: '+1234567890'
        },
        businessInfo: {
          type: 'dairy',
          description: 'Test company for development'
        },
        subscription: {
          plan: 'professional',
          status: 'active',
          maxUsers: 50,
          maxProducts: 1000,
          maxOrders: 5000
        }
      });
      await company.save();
    }
    
    // Check if user already exists
    let user = await User.findOne({ email: testUserEmail });
    
    if (!user) {
      // Create test user
      user = new User({
        name: 'Test User',
        email: testUserEmail,
        password: testPassword,
        role: 'company_admin',
        company: company._id,
        tenantId: testTenantId,
        isCompanyOwner: true,
        isActive: true,
        isEmailVerified: true
      });
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Test tenant created successfully',
      data: {
        company: {
          id: company._id,
          name: company.name,
          tenantId: company.tenantId,
          slug: company.slug
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        },
        loginCredentials: {
          tenantId: testTenantId,
          username: testUserEmail,
          password: testPassword
        }
      }
    });
  } catch (error) {
    console.error('Create test tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test tenant',
      error: error.message
    });
  }
});

// @desc    Debug database collections
// @route   GET /api/debug/collections
// @access  Public (for development only)
router.get('/collections', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    const counts = {};
    for (const collectionName of collectionNames) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        counts[collectionName] = count;
      } catch (error) {
        counts[collectionName] = `Error: ${error.message}`;
      }
    }
    
    res.json({
      success: true,
      data: {
        database: mongoose.connection.name,
        collections: collectionNames,
        counts: counts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Check inventory data
// @route   GET /api/debug/inventory
// @access  Public (for development only)
router.get('/inventory', async (req, res) => {
  try {
    const inventoryCount = await Inventory.countDocuments();
    const inventoryItems = await Inventory.find()
      .populate('product', 'name sku')
      .limit(10);
    
    const productCount = await Product.countDocuments();
    const products = await Product.find().limit(10).select('name sku status');
    
    res.json({
      success: true,
      data: {
        inventory: {
          count: inventoryCount,
          items: inventoryItems,
          sample: inventoryItems.length > 0 ? inventoryItems[0] : null
        },
        products: {
          count: productCount,
          items: products
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Check dealer data
// @route   GET /api/debug/dealers
// @access  Public (for development only)
router.get('/dealers', async (req, res) => {
  try {
    const dealerCount = await Dealer.countDocuments();
    const dealers = await Dealer.find()
      .limit(5)
      .select('name dealerCode financialInfo.currentBalance financialInfo.openingBalance');
    
    res.json({
      success: true,
      data: {
        count: dealerCount,
        dealers: dealers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Check order data
// @route   GET /api/debug/orders
// @access  Public (for development only)
router.get('/orders', async (req, res) => {
  try {
    const orderCount = await Order.countDocuments();
    const orders = await Order.find()
      .populate('dealer', 'name')
      .populate('items.product', 'name sku')
      .limit(5)
      .select('orderNumber status dealer items pricing');
    
    res.json({
      success: true,
      data: {
        count: orderCount,
        orders: orders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Create sample inventory data
// @route   POST /api/debug/create-sample-inventory
// @access  Public (for development only)
router.post('/create-sample-inventory', async (req, res) => {
  try {
    // First, get some products to create inventory for
    const products = await Product.find({ status: 'active' }).limit(5);
    
    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active products found. Please create products first.'
      });
    }
    
    const inventoryItems = [];
    
    for (const product of products) {
      // Check if inventory already exists for this product
      const existingInventory = await Inventory.findOne({
        product: product._id,
        'location.warehouse': 'Warehouse A'
      });
      
      if (!existingInventory) {
        const inventoryItem = new Inventory({
          product: product._id,
          location: {
            warehouse: 'Warehouse A',
            zone: 'Section 1',
            aisle: 'A1',
            shelf: '1',
            bin: '001'
          },
          stock: {
            available: Math.floor(Math.random() * 200) + 50, // 50-250 units
            reserved: 0,
            damaged: 0,
            expired: 0,
            inTransit: 0
          },
          thresholds: {
            minimum: 20,
            maximum: 500,
            reorderPoint: 50,
            reorderQuantity: 100
          },
          pricing: {
            averageCost: Math.floor(Math.random() * 50) + 10, // ₹10-60
            lastPurchasePrice: Math.floor(Math.random() * 60) + 15, // ₹15-75
            totalValue: 0 // Will be calculated
          },
          batches: [{
            batchNumber: `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            quantity: Math.floor(Math.random() * 100) + 50,
            manufactureDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
            expiryDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in next 90 days
            receivedDate: new Date()
          }],
          movements: [],
          alerts: []
        });
        
        // Calculate total value
        inventoryItem.pricing.totalValue = inventoryItem.stock.available * inventoryItem.pricing.averageCost;
        
        await inventoryItem.save();
        inventoryItems.push(inventoryItem);
      }
    }
    
    res.json({
      success: true,
      message: `Created ${inventoryItems.length} inventory items`,
      data: {
        created: inventoryItems.length,
        products: products.map(p => ({ id: p._id, name: p.name, sku: p.sku })),
        inventoryItems: inventoryItems.map(item => ({
          id: item._id,
          product: item.product,
          stock: item.stock,
          location: item.location
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test stock check functionality
// @route   POST /api/debug/test-stock-check
// @access  Public (for development only)
router.post('/test-stock-check', async (req, res) => {
  try {
    const { productIds, warehouse = 'Warehouse A' } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'productIds array is required'
      });
    }
    
    console.log('Testing stock check for products:', productIds);
    console.log('Warehouse:', warehouse);
    
    const inventoryItems = await Inventory.find({
      product: { $in: productIds },
      'location.warehouse': warehouse
    }).populate('product', 'name sku');
    
    console.log('Found inventory items:', inventoryItems.length);
    
    const results = inventoryItems.map(item => ({
      productId: item.product._id,
      productName: item.product.name,
      sku: item.product.sku,
      available: item.stock.available - item.stock.reserved,
      reserved: item.stock.reserved,
      total: item.stock.available,
      minimum: item.thresholds.minimum,
      location: item.location,
      status: item.stock.available === 0 ? 'out_of_stock' : 
              item.stock.available <= item.thresholds.minimum ? 'low_stock' : 'available'
    }));
    
    // Check for products not found in inventory
    const foundProductIds = results.map(r => r.productId.toString());
    const notFoundProducts = productIds.filter(id => !foundProductIds.includes(id.toString()));
    
    res.json({
      success: true,
      data: {
        found: results,
        notFound: notFoundProducts,
        summary: {
          totalRequested: productIds.length,
          foundInInventory: results.length,
          notFoundInInventory: notFoundProducts.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Create default warehouses
// @route   POST /api/debug/create-default-warehouses
// @access  Public (for development only)
router.post('/create-default-warehouses', async (req, res) => {
  try {
    const defaultWarehouses = [
      {
        name: 'Main Warehouse',
        code: 'WH-MAIN',
        description: 'Primary storage facility',
        address: {
          street: '123 Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        contact: {
          phone: '+91-9876543210',
          email: 'warehouse@milkcompany.com',
          manager: {
            name: 'Warehouse Manager',
            phone: '+91-9876543211',
            email: 'manager@milkcompany.com'
          }
        },
        capacity: {
          maxItems: 10000,
          maxWeight: 5000,
          unit: 'kg'
        },
        status: 'active',
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') // System user ID
      },
      {
        name: 'Cold Storage',
        code: 'WH-COLD',
        description: 'Temperature controlled storage',
        address: {
          street: '456 Cold Chain Road',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001',
          country: 'India'
        },
        contact: {
          phone: '+91-9876543212',
          email: 'coldstorage@milkcompany.com'
        },
        capacity: {
          maxItems: 5000,
          maxWeight: 2000,
          unit: 'kg'
        },
        settings: {
          temperatureControlled: true,
          temperatureRange: {
            min: 2,
            max: 8,
            unit: 'celsius'
          }
        },
        status: 'active',
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      }
    ];
    
    const createdWarehouses = [];
    for (const warehouseData of defaultWarehouses) {
      // Check if warehouse already exists
      const existingWarehouse = await Warehouse.findOne({ code: warehouseData.code });
      if (!existingWarehouse) {
        const warehouse = await Warehouse.create(warehouseData);
        createdWarehouses.push(warehouse);
      }
    }
    
    res.json({
      success: true,
      message: `Created ${createdWarehouses.length} warehouses`,
      data: {
        created: createdWarehouses,
        total: await Warehouse.countDocuments()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Migrate inventory warehouse strings to ObjectIds
// @route   POST /api/debug/migrate-inventory-warehouses
// @access  Public (for development only)
router.post('/migrate-inventory-warehouses', async (req, res) => {
  try {
    // Get all warehouses
    const warehouses = await Warehouse.find();
    const warehouseMap = {};
    
    // Create mapping from warehouse names/codes to ObjectIds
    warehouses.forEach(warehouse => {
      warehouseMap[warehouse.name] = warehouse._id;
      warehouseMap[warehouse.code] = warehouse._id;
      warehouseMap[warehouse.name.toLowerCase()] = warehouse._id;
      warehouseMap[warehouse.code.toLowerCase()] = warehouse._id;
    });
    
    // Add common warehouse string mappings
    warehouseMap['Warehouse A'] = warehouses.find(w => w.code === 'WH-MAIN')?._id || warehouses[0]?._id;
    warehouseMap['warehouse a'] = warehouseMap['Warehouse A'];
    warehouseMap['Main'] = warehouseMap['Warehouse A'];
    warehouseMap['main'] = warehouseMap['Warehouse A'];
    
    // Get all inventory items with string warehouse references
    const inventoryItems = await Inventory.find({
      'location.warehouse': { $type: 'string' }
    });
    
    console.log(`Found ${inventoryItems.length} inventory items with string warehouse references`);
    
    const migrationResults = {
      migrated: 0,
      failed: 0,
      errors: []
    };
    
    for (const item of inventoryItems) {
      try {
        const warehouseString = item.location.warehouse;
        let warehouseId = warehouseMap[warehouseString];
        
        if (!warehouseId) {
          // Try case-insensitive matching
          const lowerString = warehouseString.toLowerCase();
          warehouseId = warehouseMap[lowerString];
        }
        
        if (!warehouseId) {
          // Default to first warehouse if no match found
          warehouseId = warehouses[0]?._id;
          console.warn(`No warehouse match found for "${warehouseString}", using default warehouse`);
        }
        
        if (warehouseId) {
          await Inventory.findByIdAndUpdate(item._id, {
            'location.warehouse': warehouseId
          });
          migrationResults.migrated++;
        } else {
          migrationResults.failed++;
          migrationResults.errors.push(`No warehouse available for item ${item._id}`);
        }
      } catch (error) {
        migrationResults.failed++;
        migrationResults.errors.push(`Error migrating item ${item._id}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Migration completed. ${migrationResults.migrated} items migrated, ${migrationResults.failed} failed`,
      data: {
        totalItems: inventoryItems.length,
        migrated: migrationResults.migrated,
        failed: migrationResults.failed,
        errors: migrationResults.errors,
        warehouseMapping: Object.keys(warehouseMap)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test inventory service stock availability
// @route   POST /api/debug/test-inventory-service
// @access  Public (for development only)
router.post('/test-inventory-service', async (req, res) => {
  try {
    const inventoryService = require('../services/inventoryService');
    const { productIds, warehouse } = req.body;
    
    console.log('Testing inventory service with:', { productIds, warehouse });
    
    // Test warehouse resolution first
    const warehouseId = await inventoryService.getWarehouseId(warehouse || "Warehouse A");
    console.log('Resolved warehouse ID:', warehouseId);
    
    const stockAvailability = await inventoryService.getStockAvailability(
      productIds || ["688cb54e624df4c8f29f9bb1"], 
      warehouse || "Warehouse A"
    );
    
    res.json({
      success: true,
      data: {
        stockAvailability,
        warehouseInput: warehouse || "Warehouse A",
        resolvedWarehouseId: warehouseId,
        productIds: productIds || ["688cb54e624df4c8f29f9bb1"]
      }
    });
  } catch (error) {
    console.error('Inventory service test error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Get inventory movements for debugging
// @route   GET /api/debug/inventory-movements
// @access  Public (for development only)
router.get('/inventory-movements', async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate('product', 'name sku')
      .populate('location.warehouse', 'name code')
      .select('product location stock movements');
    
    const movementData = inventory.map(item => ({
      product: item.product.name,
      sku: item.product.sku,
      warehouse: item.location.warehouse.name,
      stock: item.stock,
      movements: item.movements, // All movements
      calculatedReserved: item.movements
        .filter(m => m.type === 'adjustment' && m.reason.includes('reserved'))
        .reduce((sum, m) => sum + m.quantity, 0)
    }));
    
    res.json({
      success: true,
      data: movementData
    });
  } catch (error) {
    console.error('Get inventory movements error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Fix inventory stock levels based on movements
// @route   POST /api/debug/fix-inventory-stock
// @access  Public (for development only)
router.post('/fix-inventory-stock', async (req, res) => {
  try {
    const inventory = await Inventory.find();
    const fixes = [];
    
    for (const item of inventory) {
      // Calculate reserved stock from movements
      const reservedFromMovements = item.movements
        .filter(m => m.type === 'adjustment' && m.reason.includes('reserved'))
        .reduce((sum, m) => sum + m.quantity, 0);
      
      // Calculate released stock from movements  
      const releasedFromMovements = item.movements
        .filter(m => m.type === 'adjustment' && m.reason.includes('released'))
        .reduce((sum, m) => Math.abs(m.quantity), 0);
      
      const correctReservedStock = Math.max(0, reservedFromMovements - releasedFromMovements);
      
      if (item.stock.reserved !== correctReservedStock) {
        const oldReserved = item.stock.reserved;
        item.stock.reserved = correctReservedStock;
        await item.save();
        
        await item.populate('product', 'name sku');
        
        fixes.push({
          product: item.product.name,
          sku: item.product.sku,
          oldReserved,
          newReserved: correctReservedStock,
          difference: correctReservedStock - oldReserved
        });
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixes.length} inventory items`,
      data: fixes
    });
  } catch (error) {
    console.error('Fix inventory stock error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Check SKU availability for product creation
// @route   POST /api/debug/check-sku-availability
// @access  Public (for development only)
router.post('/check-sku-availability', async (req, res) => {
  try {
    const { sku } = req.body;
    
    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required'
      });
    }
    
    // Convert to uppercase like the model does
    const upperSku = sku.toUpperCase();
    
    // Check if SKU exists
    const existingProduct = await Product.findOne({ sku: upperSku });
    
    // Get all existing SKUs for reference
    const allProducts = await Product.find({}, 'sku name').sort({ sku: 1 });
    
    res.json({
      success: true,
      data: {
        requestedSku: sku,
        normalizedSku: upperSku,
        isAvailable: !existingProduct,
        existingProduct: existingProduct ? {
          id: existingProduct._id,
          name: existingProduct.name,
          sku: existingProduct.sku
        } : null,
        allExistingSkus: allProducts.map(p => ({ sku: p.sku, name: p.name })),
        suggestedSkus: existingProduct ? [
          `${upperSku}-NEW`,
          `${upperSku}-V2`,
          `${upperSku}${Date.now().toString().slice(-3)}`
        ] : []
      }
    });
  } catch (error) {
    console.error('Check SKU availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Comprehensive database check for stock issues
// @route   GET /api/debug/stock-analysis
// @access  Public (for development only)
router.get('/stock-analysis', async (req, res) => {
  try {
    // Get products
    const products = await Product.find().limit(10);
    console.log(`Found ${products.length} products`);
    
    // Get inventory
    const inventory = await Inventory.find()
      .populate('product', 'name sku')
      .populate('location.warehouse', 'name code')
      .limit(10);
    console.log(`Found ${inventory.length} inventory items`);
    
    // Get warehouses
    const warehouses = await Warehouse.find();
    console.log(`Found ${warehouses.length} warehouses`);
    
    // Get recent orders
    const orders = await Order.find()
      .populate('dealer', 'name')
      .populate('items.product', 'name sku')
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(`Found ${orders.length} orders`);
    
    // Analyze stock availability
    const stockAnalysis = [];
    
    for (const product of products.slice(0, 5)) {
      const productInventory = inventory.filter(inv => 
        inv.product && inv.product._id.toString() === product._id.toString()
      );
      
      const analysis = {
        product: {
          id: product._id,
          name: product.name,
          sku: product.sku,
          status: product.status
        },
        inventory: productInventory.map(inv => ({
          id: inv._id,
          warehouse: inv.location?.warehouse ? {
            id: inv.location.warehouse._id,
            name: inv.location.warehouse.name,
            code: inv.location.warehouse.code
          } : 'No warehouse',
          stock: {
            available: inv.stock?.available || 0,
            reserved: inv.stock?.reserved || 0,
            total: (inv.stock?.available || 0) + (inv.stock?.reserved || 0)
          },
          location: {
            warehouse: inv.location?.warehouse ? 'ObjectId' : typeof inv.location?.warehouse,
            rawWarehouse: inv.location?.warehouse
          }
        })),
        totalAvailable: productInventory.reduce((sum, inv) => sum + (inv.stock?.available || 0), 0),
        totalReserved: productInventory.reduce((sum, inv) => sum + (inv.stock?.reserved || 0), 0)
      };
      
      stockAnalysis.push(analysis);
    }
    
    // Check for common issues
    const issues = [];
    
    // Check if inventory has string warehouse values
    const stringWarehouses = inventory.filter(inv => 
      typeof inv.location?.warehouse === 'string'
    );
    if (stringWarehouses.length > 0) {
      issues.push(`${stringWarehouses.length} inventory items have string warehouse values (need migration)`);
    }
    
    // Check if any inventory has zero stock
    const zeroStock = inventory.filter(inv => 
      (inv.stock?.available || 0) === 0
    );
    if (zeroStock.length > 0) {
      issues.push(`${zeroStock.length} inventory items have zero available stock`);
    }
    
    // Check for products without inventory
    const productsWithoutInventory = products.filter(product => 
      !inventory.some(inv => 
        inv.product && inv.product._id.toString() === product._id.toString()
      )
    );
    if (productsWithoutInventory.length > 0) {
      issues.push(`${productsWithoutInventory.length} products have no inventory records`);
    }
    
    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalInventory: inventory.length,
          totalWarehouses: warehouses.length,
          totalOrders: orders.length
        },
        products: products.map(p => ({
          id: p._id,
          name: p.name,
          sku: p.sku,
          status: p.status
        })),
        warehouses: warehouses.map(w => ({
          id: w._id,
          name: w.name,
          code: w.code,
          status: w.status
        })),
        inventory: inventory.map(inv => ({
          id: inv._id,
          product: inv.product ? {
            id: inv.product._id,
            name: inv.product.name,
            sku: inv.product.sku
          } : 'No product',
          warehouse: inv.location?.warehouse ? {
            id: inv.location.warehouse._id || inv.location.warehouse,
            name: inv.location.warehouse.name || 'String value',
            code: inv.location.warehouse.code || 'N/A',
            type: typeof inv.location.warehouse
          } : 'No warehouse',
          stock: {
            available: inv.stock?.available || 0,
            reserved: inv.stock?.reserved || 0
          }
        })),
        stockAnalysis,
        recentOrders: orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          dealer: order.dealer?.name || 'No dealer',
          items: order.items?.map(item => ({
            product: item.product?.name || 'Unknown product',
            quantity: item.quantity
          })) || [],
          total: order.pricing?.total || 0,
          createdAt: order.createdAt
        })),
        issues,
        recommendations: [
          issues.length === 0 ? "No major issues detected" : "Issues found - see issues array",
          inventory.length === 0 ? "Create inventory records for your products" : "Inventory records exist",
          warehouses.length === 0 ? "Create warehouse records first" : "Warehouses are configured",
        ]
      }
    });
  } catch (error) {
    console.error('Stock analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Check specific dealer transactions
// @route   GET /api/debug/dealer-transactions/:id
// @access  Public (for development only)
router.get('/dealer-transactions/:id', async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id)
      .select('name dealerCode financialInfo transactions')
      .populate('transactions.createdBy', 'name email');
    
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }
    
    // Get orders for this dealer
    const orders = await Order.find({ dealer: req.params.id })
      .select('orderNumber status pricing payment createdAt')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        dealer: {
          id: dealer._id,
          name: dealer.name,
          dealerCode: dealer.dealerCode,
          financialInfo: dealer.financialInfo
        },
        transactions: dealer.transactions || [],
        orders: orders,
        analysis: {
          totalTransactions: (dealer.transactions || []).length,
          totalOrders: orders.length,
          openingBalance: dealer.financialInfo?.openingBalance || 0,
          currentBalance: dealer.financialInfo?.currentBalance || 0,
          balanceDifference: (dealer.financialInfo?.currentBalance || 0) - (dealer.financialInfo?.openingBalance || 0),
          hasTransactionRecords: (dealer.transactions || []).length > 0
        }
      }
    });
  } catch (error) {
    console.error('Get dealer transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Migrate missing dealer transaction records
// @route   POST /api/debug/migrate-dealer-transactions
// @access  Public (for development only)
router.post('/migrate-dealer-transactions', async (req, res) => {
  try {
    const dealers = await Dealer.find();
    const migrationResults = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: []
    };
    
    for (const dealer of dealers) {
      try {
        migrationResults.processed++;
        
        const openingBalance = dealer.financialInfo?.openingBalance || 0;
        const openingBalanceType = dealer.financialInfo?.openingBalanceType || 'credit';
        const currentBalance = dealer.financialInfo?.currentBalance || 0;
        
        // Calculate expected opening balance value (credit = positive, debit = negative)
        const expectedOpeningBalance = openingBalanceType === 'credit' ? openingBalance : -openingBalance;
        
        // Check if there's a balance difference that should have transaction records
        const balanceDifference = currentBalance - expectedOpeningBalance;
        
        // If there's a difference but no transactions, create a synthetic transaction
        if (Math.abs(balanceDifference) > 0.01 && (dealer.transactions || []).length === 0) {
          const transactionType = balanceDifference > 0 ? 'credit' : 'debit';
          const amount = Math.abs(balanceDifference);
          
          dealer.transactions = dealer.transactions || [];
          dealer.transactions.push({
            type: transactionType,
            amount: amount,
            description: `Historical balance adjustment (migrated from balance difference)`,
            reference: {
              type: 'Adjustment'
            },
            balanceAfter: currentBalance,
            date: dealer.updatedAt || dealer.createdAt || new Date(),
            notes: `Auto-migrated: Opening=${expectedOpeningBalance}, Current=${currentBalance}, Difference=${balanceDifference}`
          });
          
          await dealer.save();
          migrationResults.migrated++;
          
          console.log(`Migrated dealer ${dealer.name}: added ${transactionType} transaction of ${amount}`);
        } else {
          migrationResults.skipped++;
        }
      } catch (error) {
        migrationResults.errors.push({
          dealerId: dealer._id,
          dealerName: dealer.name,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Migration completed. Processed ${migrationResults.processed} dealers, migrated ${migrationResults.migrated}, skipped ${migrationResults.skipped}`,
      data: migrationResults
    });
  } catch (error) {
    console.error('Migrate dealer transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test balance sheet for specific dealer (no auth)
// @route   GET /api/debug/balance-sheet/:id
// @access  Public (for development only)
router.get('/balance-sheet/:id', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Find dealer with transactions
    const dealer = await Dealer.findById(req.params.id)
      .populate('dealerGroup', 'name code color discountPercentage creditLimit creditDays');

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    // Get orders within date range
    let orderQuery = { dealer: req.params.id };
    
    if (startDate || endDate) {
      orderQuery.createdAt = {};
      if (startDate) orderQuery.createdAt.$gte = new Date(startDate);
      if (endDate) orderQuery.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const orders = await Order.find(orderQuery)
      .select('orderNumber createdAt status pricing payment')
      .sort({ createdAt: 1 });

    // Build balance sheet transactions
    const transactions = [];
    
    // Opening balance
    const openingBalance = dealer.financialInfo?.openingBalance || 0;
    const openingBalanceType = dealer.financialInfo?.openingBalanceType || 'credit';
    const calculatedOpeningBalance = openingBalanceType === 'credit' ? openingBalance : -openingBalance;
    
    let runningBalance = calculatedOpeningBalance;
    
    transactions.push({
      id: 'opening',
      date: startDate || '2025-01-01',
      type: 'opening',
      description: `Opening Balance (${openingBalanceType})`,
      reference: 'System',
      debit: calculatedOpeningBalance < 0 ? Math.abs(calculatedOpeningBalance) : 0,
      credit: calculatedOpeningBalance > 0 ? calculatedOpeningBalance : 0,
      balance: calculatedOpeningBalance,
      status: 'completed'
    });

    // Add dealer transactions with order details
    if (dealer.transactions) {
      // Get all order IDs referenced in transactions
      const orderIds = dealer.transactions
        .filter(t => t.reference?.type === 'Order' && t.reference?.id)
        .map(t => t.reference.id);
      
      // Fetch order details for invoice information
      const orderDetails = {};
      if (orderIds.length > 0) {
        const Order = require('../models/Order');
        const orderList = await Order.find({ _id: { $in: orderIds } })
          .populate('items.product', 'name sku')
          .select('orderNumber items pricing payment status createdAt');
        
        orderList.forEach(order => {
          orderDetails[order._id.toString()] = order;
        });
      }
      
      dealer.transactions
        .filter(t => {
          if (!startDate && !endDate) return true;
          const tDate = new Date(t.date);
          const start = startDate ? new Date(startDate) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date('2100-01-01');
          return tDate >= start && tDate <= end;
        })
        .forEach(transaction => {
          if (transaction.type === 'debit') {
            runningBalance -= transaction.amount;
          } else {
            runningBalance += transaction.amount;
          }
          
          // Get order details if this transaction references an order
          let invoiceDetails = null;
          let displayReference = transaction.reference?.id || '-';
          
          if (transaction.reference?.type === 'Order' && transaction.reference?.id) {
            const order = orderDetails[transaction.reference.id.toString()];
            if (order) {
              invoiceDetails = order;
              displayReference = order.orderNumber;
            }
          }
          
          transactions.push({
            id: transaction._id,
            date: transaction.date,
            type: transaction.type === 'debit' ? 'invoice' : transaction.type,
            description: transaction.description,
            reference: displayReference,
            referenceType: transaction.reference?.type || '-',
            debit: transaction.type === 'debit' ? transaction.amount : 0,
            credit: transaction.type === 'credit' ? transaction.amount : 0,
            balance: runningBalance,
            status: 'completed',
            invoiceDetails: invoiceDetails
          });
        });
    }

    // NOTE: Orders are already included as transaction records via inventoryService.updateDealerBalance()
    // We don't need to add them separately as invoices to avoid double-counting

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate running balances after sorting
    let sortedBalance = calculatedOpeningBalance;
    transactions.forEach((transaction, index) => {
      if (index === 0) {
        transaction.balance = sortedBalance;
      } else {
        sortedBalance = sortedBalance - transaction.debit + transaction.credit;
        transaction.balance = sortedBalance;
      }
    });

    // Calculate summary
    const totalDebits = transactions.filter(t => t.type !== 'opening').reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = transactions.filter(t => t.type !== 'opening').reduce((sum, t) => sum + t.credit, 0);
    const totalInvoices = transactions.filter(t => t.type === 'invoice').length;
    const pendingAmount = orders
      .filter(o => ['pending', 'processing'].includes(o.status))
      .reduce((sum, o) => sum + ((o.pricing?.total || 0) - (o.payment?.paidAmount || 0)), 0);

    const summary = {
      openingBalance: calculatedOpeningBalance,
      totalDebits,
      totalCredits,
      closingBalance: sortedBalance,
      totalInvoices,
      pendingAmount
    };

    res.json({
      success: true,
      data: {
        dealer: {
          _id: dealer._id,
          name: dealer.name,
          dealerCode: dealer.dealerCode,
          dealerGroup: dealer.dealerGroup,
          contactInfo: dealer.contactInfo,
          financialInfo: dealer.financialInfo
        },
        transactions,
        summary
      }
    });
  } catch (error) {
    console.error('Get dealer balance sheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealer balance sheet'
    });
  }
});

// @desc    Fix existing order transaction descriptions
// @route   POST /api/debug/fix-order-descriptions
// @access  Public (for development only)
router.post('/fix-order-descriptions', async (req, res) => {
  try {
    const dealers = await Dealer.find({ 'transactions.reference.type': 'Order' });
    const fixed = [];
    
    for (const dealer of dealers) {
      let hasChanges = false;
      
      for (const transaction of dealer.transactions) {
        if (transaction.reference?.type === 'Order' && transaction.reference?.id) {
          // Get order details
          const Order = require('../models/Order');
          const order = await Order.findById(transaction.reference.id);
          
          if (order) {
            const itemCount = order.items?.length || 0;
            const newDescription = `Invoice #${order.orderNumber} - ${itemCount} item(s)`;
            
            if (transaction.description !== newDescription) {
              transaction.description = newDescription;
              hasChanges = true;
              
              fixed.push({
                dealer: dealer.name,
                orderId: order._id,
                orderNumber: order.orderNumber,
                oldDescription: transaction.description,
                newDescription: newDescription
              });
            }
          }
        }
      }
      
      if (hasChanges) {
        await dealer.save();
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixed.length} transaction descriptions`,
      data: { fixed }
    });
  } catch (error) {
    console.error('Fix order descriptions error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test order creation with custom adjustment
// @route   POST /api/debug/test-order-creation
// @access  Public (for development only)
router.post('/test-order-creation', async (req, res) => {
  try {
    const { dealerId, productId, customText, customAmount } = req.body;
    
    // Use defaults if not provided
    const testDealerId = dealerId || '688dc21b4dd21a89379324df'; // deva
    const testProductId = productId || '688cb54e624df4c8f29f9bb1'; // MILK
    const testCustomText = customText || 'Test discount for damaged goods';
    const testCustomAmount = customAmount || 50;
    
    const Order = require('../models/Order');
    
    // Create test order data
    const orderData = {
      dealer: testDealerId,
      orderType: 'dealer',
      items: [{
        product: testProductId,
        quantity: 2,
        unitPrice: 100,
        discount: 0,
        igst: 0,
        cgst: 8,
        sgst: 8,
        taxAmount: 16,
        totalPrice: 200
      }],
      pricing: {
        subtotal: 200,
        discount: 0,
        tax: 16,
        shipping: 0,
        total: 166, // 200 + 16 - 50 (custom adjustment)
        globalDiscount: 0,
        globalDiscountType: 'percentage',
        customAdjustment: {
          text: testCustomText,
          amount: testCustomAmount,
          type: 'fixed'
        }
      },
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
        dueAmount: 166
      },
      shipping: {
        method: 'pickup',
        address: {
          warehouse: 'Warehouse A'
        }
      },
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') // Dummy user ID
    };
    
    console.log('Creating test order with custom adjustment:', JSON.stringify(orderData.pricing.customAdjustment, null, 2));
    
    const order = await Order.create(orderData);
    
    // Fetch the created order to verify it was saved correctly
    const savedOrder = await Order.findById(order._id)
      .populate('dealer', 'name')
      .populate('items.product', 'name sku');
    
    res.json({
      success: true,
      message: 'Test order created successfully',
      data: {
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber,
        dealer: savedOrder.dealer?.name,
        customAdjustment: savedOrder.pricing?.customAdjustment,
        fullOrder: savedOrder
      }
    });
  } catch (error) {
    console.error('Test order creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test real order creation API with custom adjustment
// @route   POST /api/debug/test-real-order-api
// @access  Public (for development only)
router.post('/test-real-order-api', async (req, res) => {
  try {
    const { customText, customAmount } = req.body;
    
    // Create a test order through the real API
    const testOrderData = {
      dealer: '688dc21b4dd21a89379324df', // deva
      orderType: 'dealer',
      items: [{
        product: '688cb54e624df4c8f29f9bb1', // MILK
        quantity: 1,
        unitPrice: 50,
        discount: 0,
        igst: 0,
        cgst: 8,
        sgst: 8,
        taxAmount: 8,
        totalPrice: 50
      }],
      pricing: {
        subtotal: 50,
        discount: 0,
        tax: 8,
        shipping: 0,
        total: 33, // 50 + 8 - 25 = 33 (with custom adjustment)
        globalDiscount: 0,
        globalDiscountType: 'percentage',
        customAdjustment: {
          text: customText || 'Debug test - custom discount',
          amount: customAmount || 25,
          type: 'fixed'
        }
      },
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
        dueAmount: 33
      },
      shipping: {
        method: 'pickup',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'India',
          warehouse: 'Warehouse A'
        }
      }
    };
    
    // Simulate authenticated user
    const mockUser = { id: '507f1f77bcf86cd799439011', role: 'admin' };
    
    // Call the order creation logic directly (similar to the API route)
    const Order = require('../models/Order');
    const Product = require('../models/Product');
    const Dealer = require('../models/Dealer');
    const Customer = require('../models/Customer');
    
    console.log('Debug - Received pricing data:', JSON.stringify(testOrderData.pricing, null, 2));
    
    const orderData = {
      ...testOrderData,
      createdBy: mockUser.id
    };
    
    // Validate dealer exists
    const buyer = await Dealer.findById(orderData.dealer);
    if (!buyer) {
      return res.status(400).json({
        success: false,
        message: 'Dealer not found'
      });
    }
    
    // Validate products exist and calculate pricing
    let subtotal = 0;
    for (let item of orderData.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }
      
      if (product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product is not active: ${product.name}`
        });
      }

      item.totalPrice = (item.quantity * item.unitPrice) - (item.discount || 0);
      subtotal += item.totalPrice;
    }

    // Calculate totals - preserve frontend pricing fields (using the fixed logic)
    const originalPricing = orderData.pricing || {};
    orderData.pricing = {
      subtotal,
      discount: originalPricing.discount || 0,
      tax: originalPricing.tax || 0,
      shipping: originalPricing.shipping || 0,
      total: originalPricing.total || (subtotal - (originalPricing.discount || 0) + (originalPricing.tax || 0) + (originalPricing.shipping || 0)),
      // Preserve frontend discount and adjustment fields
      globalDiscount: originalPricing.globalDiscount || 0,
      globalDiscountType: originalPricing.globalDiscountType || 'percentage',
      customAdjustment: originalPricing.customAdjustment || { text: '', amount: 0, type: 'fixed' }
    };
    
    console.log('Debug - Final pricing data:', JSON.stringify(orderData.pricing, null, 2));

    // Set payment due amount
    orderData.payment.dueAmount = orderData.pricing.total - (orderData.payment.paidAmount || 0);

    const order = await Order.create(orderData);
    
    // Fetch the created order to verify
    const savedOrder = await Order.findById(order._id)
      .populate('dealer', 'name')
      .populate('items.product', 'name sku');
    
    res.json({
      success: true,
      message: 'Test order created via real API logic',
      data: {
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber,
        dealer: savedOrder.dealer?.name,
        originalCustomAdjustment: testOrderData.pricing.customAdjustment,
        savedCustomAdjustment: savedOrder.pricing?.customAdjustment,
        pricingComparison: {
          sent: testOrderData.pricing,
          saved: savedOrder.pricing
        }
      }
    });
  } catch (error) {
    console.error('Test real order API error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Check custom adjustments in recent orders
// @route   GET /api/debug/check-custom-adjustments
// @access  Public (for development only)
router.get('/check-custom-adjustments', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    // Get recent orders with custom adjustments
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber pricing.customAdjustment dealer')
      .populate('dealer', 'name');
    
    const results = orders.map(order => ({
      orderNumber: order.orderNumber,
      dealer: order.dealer?.name || 'Unknown',
      customAdjustment: order.pricing?.customAdjustment || 'Not found',
      hasCustomText: !!(order.pricing?.customAdjustment?.text?.trim()),
      hasCustomAmount: !!(order.pricing?.customAdjustment?.amount > 0)
    }));
    
    res.json({
      success: true,
      message: 'Custom adjustment check complete',
      data: {
        totalOrders: results.length,
        ordersWithCustomText: results.filter(r => r.hasCustomText).length,
        ordersWithCustomAmount: results.filter(r => r.hasCustomAmount).length,
        orders: results
      }
    });
  } catch (error) {
    console.error('Check custom adjustments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Test order update with notes
// @route   POST /api/debug/test-order-update
// @access  Public (for development only)
router.post('/test-order-update', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    // Get a recent order to update
    const order = await Order.findOne().sort({ createdAt: -1 });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No orders found to test'
      });
    }
    
    console.log('Original order notes:', order.notes);
    
    // Try to update with new notes structure
    const updateData = {
      notes: {
        customer: 'Test customer note',
        internal: 'Test internal note',
        delivery: 'Test delivery note'
      }
    };
    
    console.log('Attempting to update with:', updateData);
    
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Order updated successfully',
      data: {
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        originalNotes: order.notes,
        updatedNotes: updatedOrder.notes
      }
    });
  } catch (error) {
    console.error('Test order update error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
});

// @desc    Get specific order details for debugging calculations
// @route   GET /api/debug/order/:orderNumber
// @access  Public (for development only)
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('dealer', 'name')
      .populate('items.product', 'name sku')
      .populate('customer', 'personalInfo.firstName personalInfo.lastName');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Calculate expected totals manually for comparison
    let itemsSubtotal = 0;
    let itemsDiscount = 0;
    let itemsTax = 0;
    let itemsTotal = 0;
    
    const itemCalculations = order.items.map(item => {
      const subtotal = item.unitPrice * item.quantity;
      const discount = item.discount || 0;
      const afterDiscount = subtotal - discount;
      
      let taxAmount = 0;
      if (item.igst > 0) {
        taxAmount = (afterDiscount * item.igst) / 100;
      } else {
        taxAmount = (afterDiscount * ((item.cgst || 0) + (item.sgst || 0))) / 100;
      }
      
      const total = afterDiscount + taxAmount;
      
      itemsSubtotal += subtotal;
      itemsDiscount += discount;
      itemsTax += taxAmount;
      itemsTotal += total;
      
      return {
        product: item.product?.name || 'Unknown',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
        discount,
        afterDiscount,
        taxRates: {
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0
        },
        calculatedTaxAmount: taxAmount,
        storedTaxAmount: item.taxAmount,
        calculatedTotal: total,
        storedTotal: item.totalPrice
      };
    });
    
    // Apply global discount
    let globalDiscountAmount = 0;
    const globalDiscount = order.pricing?.globalDiscount || 0;
    const globalDiscountType = order.pricing?.globalDiscountType || 'percentage';
    
    if (globalDiscountType === 'percentage') {
      globalDiscountAmount = (itemsTotal * globalDiscount) / 100;
    } else {
      globalDiscountAmount = globalDiscount;
    }
    
    // Apply custom adjustment
    let customAdjustmentAmount = 0;
    const customAdjustment = order.pricing?.customAdjustment || { amount: 0, type: 'fixed' };
    
    if (customAdjustment.amount > 0) {
      if (customAdjustment.type === 'percentage') {
        customAdjustmentAmount = (itemsTotal * customAdjustment.amount) / 100;
      } else {
        customAdjustmentAmount = customAdjustment.amount;
      }
    }
    
    const afterGlobalDiscount = itemsTotal - globalDiscountAmount;
    const finalTotal = afterGlobalDiscount - customAdjustmentAmount;
    
    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        dealer: order.dealer?.name,
        storedPricing: order.pricing,
        itemCalculations,
        calculatedTotals: {
          itemsSubtotal,
          itemsDiscount,
          itemsTax,
          itemsTotal,
          globalDiscount: globalDiscountAmount,
          afterGlobalDiscount,
          customAdjustment: customAdjustmentAmount,
          finalTotal
        },
        discrepancies: {
          subtotalMatch: Math.abs(itemsSubtotal - (order.pricing?.subtotal || 0)) < 0.01,
          totalMatch: Math.abs(finalTotal - (order.pricing?.total || 0)) < 0.01,
          taxMatch: Math.abs(itemsTax - (order.pricing?.tax || 0)) < 0.01
        }
      }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Create test dealer and order with custom adjustment
// @route   POST /api/debug/create-test-scenario
// @access  Public (for development only)
router.post('/create-test-scenario', async (req, res) => {
  try {
    const Dealer = require('../models/Dealer');
    const Order = require('../models/Order');
    const Product = require('../models/Product');
    const mongoose = require('mongoose');
    
    // Create a new test dealer
    const dealerData = {
      name: 'Test Dealer Calculations',
      dealerCode: `TEST${Date.now()}`,
      contactInfo: {
        primaryPhone: '9999999999',
        email: 'test@test.com'
      },
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India'
      },
      businessInfo: {
        businessName: 'Test Business',
        businessType: 'retail'
      },
      financialInfo: {
        openingBalance: 1000,
        openingBalanceType: 'credit',
        currentBalance: 1000,
        creditLimit: 5000,
        creditDays: 30
      },
      dealerGroup: '688cc9a25089d69abf6fde2a', // Using existing dealer group
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    };
    
    const dealer = await Dealer.create(dealerData);
    console.log('Created test dealer:', dealer._id);
    
    // Get a product for the order
    const product = await Product.findOne({ status: 'active' });
    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'No active products found for order creation'
      });
    }
    
    // Create a test order with custom adjustment
    const orderData = {
      dealer: dealer._id,
      orderType: 'dealer',
      items: [{
        product: product._id,
        quantity: 2,
        unitPrice: 100,
        discount: 0,
        igst: 0,
        cgst: 9,
        sgst: 9,
        taxAmount: 36, // 2 * 100 * 18% = 36
        totalPrice: 236 // 200 + 36 = 236
      }],
      pricing: {
        subtotal: 200,  // 2 * 100
        discount: 0,
        tax: 36,
        shipping: 0,
        total: 221,     // 236 - 10 (global) - 5 (custom) = 221
        globalDiscount: 10,
        globalDiscountType: 'fixed',
        customAdjustment: {
          text: 'Bulk order discount',
          amount: 5,
          type: 'fixed'
        }
      },
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
        dueAmount: 221
      },
      shipping: {
        method: 'pickup',
        address: {
          warehouse: 'Warehouse A'
        }
      },
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    };
    
    const order = await Order.create(orderData);
    
    // Fetch the created order with populated data
    const populatedOrder = await Order.findById(order._id)
      .populate('dealer', 'name dealerCode')
      .populate('items.product', 'name sku');
    
    res.json({
      success: true,
      message: 'Test scenario created successfully',
      data: {
        dealer: {
          id: dealer._id,
          name: dealer.name,
          dealerCode: dealer.dealerCode
        },
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          pricing: order.pricing,
          items: populatedOrder.items,
          expectedCalculations: {
            itemsTotal: 236, // 2 * 100 + 36 tax
            afterGlobalDiscount: 226, // 236 - 10
            afterCustomAdjustment: 221, // 226 - 5
            finalTotal: 221
          }
        }
      }
    });
  } catch (error) {
    console.error('Create test scenario error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Create test admin user
// @route   POST /api/debug/create-admin
// @access  Public (for development only)
router.post('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    let admin = await User.findOne({ email: 'admin@milkcompany.com' });
    
    if (admin) {
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');
      
      // Generate JWT token
      const token = jwt.sign(
        { id: admin._id, role: admin.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );
      
      return res.json({
        success: true,
        message: 'Admin user already exists',
        data: {
          user: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role
          },
          token
        }
      });
    }
    
    // Create new admin user
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@milkcompany.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        products: { create: true, read: true, update: true, delete: true },
        orders: { create: true, read: true, update: true, delete: true },
        customers: { create: true, read: true, update: true, delete: true },
        suppliers: { create: true, read: true, update: true, delete: true },
        inventory: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { create: true, read: true, update: true, delete: true }
      }
    });
    
    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Update user role
// @route   PUT /api/debug/update-user-role/:email
// @access  Public (for development only)
router.put('/update-user-role/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { role } = req.body;
    
    const user = await User.findOneAndUpdate(
      { email },
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test route creation
// @route   POST /api/debug/test-route
// @access  Public (for development only)
router.post('/test-route', async (req, res) => {
  try {
    const Route = require('../models/Route');
    
    // Test basic route creation
    const testRoute = new Route({
      name: 'Debug Test Route 2',
      code: 'DBG002',
      description: 'Test route created via debug endpoint',
      city: 'Test City',
      state: 'Test State',
      status: 'active',
      createdBy: '688dfeb0f6aeb844b094e8a2' // Using the admin user ID
    });
    
    const savedRoute = await testRoute.save();
    
    res.json({
      success: true,
      message: 'Test route created successfully',
      data: { route: savedRoute }
    });
  } catch (error) {
    console.error('Test route creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test auth middleware
// @route   GET /api/debug/test-auth
// @access  Private
router.get('/test-auth', require('../middleware/auth').protect, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Auth middleware working',
      data: {
        user: req.user,
        userId: req.user?.id,
        userRole: req.user?.role
      }
    });
  } catch (error) {
    console.error('Test auth error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// @desc    Test full route creation with middleware
// @route   POST /api/debug/test-route-full
// @access  Private (Admin, Manager)
const { protect, authorize } = require('../middleware/auth');
const { sanitizeInput, handleValidationErrors } = require('../middleware/validation');
const { body } = require('express-validator');

router.post('/test-route-full', [
  protect,
  authorize('admin', 'manager'),
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Route name must be between 1 and 100 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const Route = require('../models/Route');
    
    console.log('User from middleware:', req.user);
    console.log('Request body:', req.body);
    
    const routeData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    console.log('Route data to create:', routeData);
    
    const route = await Route.create(routeData);
    
    console.log('Route created successfully:', route);
    
    // Populate the created route
    await route.populate('assignedTo', 'name email');
    await route.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Route created successfully via debug',
      data: { route }
    });
  } catch (error) {
    console.error('Full route creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;