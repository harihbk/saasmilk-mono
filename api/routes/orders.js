const express = require('express');
const { body, param } = require('express-validator');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Dealer = require('../models/Dealer');
const Product = require('../models/Product');
const inventoryService = require('../services/inventoryService');
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

// @desc    Check stock availability for order items
// @route   POST /api/orders/check-stock
// @access  Private
// Note: When orderId is provided, accounts for existing reservations in that order
router.post('/check-stock', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('warehouse')
    .optional()
    .isString()
    .withMessage('Warehouse must be a string'),
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid order ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { items, warehouse, orderId } = req.body;
    
    const productIds = items.map(item => item.product);
    const tenantId = req.user.role !== 'super_admin' ? req.tenant.id : null;
    const stockAvailability = await inventoryService.getStockAvailability(productIds, warehouse, tenantId);
    
    // If this is for an existing order update, get the current reservations to add back
    let currentOrderItems = [];
    let detectedOrderId = orderId;
    
    if (orderId) {
      const existingOrder = await Order.findOne({ 
        _id: orderId,
        ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
      });
      
      if (existingOrder) {
        currentOrderItems = existingOrder.items.map(item => ({
          product: item.product,
          quantity: item.quantity
        }));
      }
    } else {
      // Try to detect if this might be an order update by finding orders with these exact products
      // This is a fallback when frontend doesn't send orderId
      const productIds = items.map(item => item.product);
      
      const potentialOrders = await Order.find({
        ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {}),
        status: { $in: ['pending', 'confirmed', 'processing', 'packed'] }, // Modifiable states
        'items.product': { $in: productIds }
      }).sort({ updatedAt: -1 }).limit(5);
      
      // Find the most recent order that matches the product set exactly
      for (const order of potentialOrders) {
        const orderProductIds = order.items.map(item => item.product.toString()).sort();
        const requestProductIds = productIds.map(id => id.toString()).sort();
        
        if (JSON.stringify(orderProductIds) === JSON.stringify(requestProductIds)) {
          detectedOrderId = order._id;
          currentOrderItems = order.items.map(item => ({
            product: item.product,
            quantity: item.quantity
          }));
          console.log(`🔍 Auto-detected order update for order ${detectedOrderId}`);
          break;
        }
      }
    }
    
    // Check if all items have sufficient stock
    const stockCheck = items.map(item => {
      const stockInfo = stockAvailability.find(stock => stock.productId.toString() === item.product);
      
      if (!stockInfo) {
        return {
          productId: item.product,
          requestedQuantity: item.quantity,
          available: 0,
          status: 'not_found',
          message: 'Product not found in inventory'
        };
      }
      
      // If this is an order update, add back the currently reserved stock for this product
      let adjustedAvailable = stockInfo.available;
      if (detectedOrderId && currentOrderItems.length > 0) {
        const currentItem = currentOrderItems.find(current => current.product.toString() === item.product);
        if (currentItem) {
          adjustedAvailable += currentItem.quantity; // Add back currently reserved stock
        }
      }
      
      const isAvailable = adjustedAvailable >= item.quantity;
      
      return {
        productId: item.product,
        productName: stockInfo.productName,
        sku: stockInfo.sku,
        requestedQuantity: item.quantity,
        available: adjustedAvailable,
        originalAvailable: stockInfo.available,
        currentlyReserved: detectedOrderId && currentOrderItems.length > 0 ? 
          currentOrderItems.find(current => current.product.toString() === item.product)?.quantity || 0 : 0,
        detectedOrderId: detectedOrderId || null,
        status: isAvailable ? 'available' : 'insufficient',
        message: isAvailable 
          ? `${item.quantity} units available` 
          : `Only ${adjustedAvailable} units available, ${item.quantity} requested`
      };
    });
    
    const allAvailable = stockCheck.every(item => item.status === 'available');
    
    res.json({
      success: true,
      data: {
        allAvailable,
        stockCheck,
        totalItems: items.length,
        availableItems: stockCheck.filter(item => item.status === 'available').length,
        detectedOrderId: detectedOrderId || null,
        message: detectedOrderId ? 
          `Stock check completed for order update (detected order: ${detectedOrderId})` : 
          'Stock check completed for new order'
      }
    });
  } catch (error) {
    console.error('Stock check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking stock availability'
    });
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['orderNumber', 'status', 'priority', 'pricing.total', 'createdAt']),
  validateSearch(['orderNumber']),
  validateDateRange
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, priority, orderType, paymentStatus, dealer, customer, startDate, endDate } = req.query;

    // Build query with tenant isolation
    let query = req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (orderType) query.orderType = orderType;
    if (paymentStatus) query['payment.status'] = paymentStatus;
    if (dealer) query.dealer = dealer;
    if (customer) query.customer = customer;
    
    // Add date range filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (req.dateQuery) {
      // Use middleware date query if no explicit dates provided
      query.createdAt = req.dateQuery;
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('customer', 'personalInfo.firstName personalInfo.lastName businessInfo.companyName')
      .populate('dealer', 'name businessName dealerGroup')
      .populate('items.product', 'name sku')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    let query = { _id: req.params.id, ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {}) };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    const order = await Order.findOne(query)
      .populate('customer')
      .populate('dealer')
      .populate('items.product')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('timeline.updatedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),
  body('dealer')
    .optional()
    .isMongoId()
    .withMessage('Invalid dealer ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one item'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  body('orderType')
    .optional()
    .isIn(['customer', 'dealer', 'retail', 'wholesale', 'subscription', 'bulk'])
    .withMessage('Invalid order type'),
  body('payment.method')
    .isIn(['cash', 'card', 'bank-transfer', 'digital-wallet', 'credit', 'cheque'])
    .withMessage('Invalid payment method'),
  body('shipping.address.street')
    .optional()
    .custom((value, { req }) => {
      if (req.body.shipping?.method !== 'pickup' && (!value || value.trim() === '')) {
        throw new Error('Shipping street address is required for delivery orders');
      }
      return true;
    }),
  body('shipping.address.city')
    .optional()
    .custom((value, { req }) => {
      if (req.body.shipping?.method !== 'pickup' && (!value || value.trim() === '')) {
        throw new Error('Shipping city is required for delivery orders');
      }
      return true;
    }),
  body('shipping.address.state')
    .optional()
    .custom((value, { req }) => {
      if (req.body.shipping?.method !== 'pickup' && (!value || value.trim() === '')) {
        throw new Error('Shipping state is required for delivery orders');
      }
      return true;
    }),
  body('shipping.address.zipCode')
    .optional()
    .custom((value, { req }) => {
      if (req.body.shipping?.method !== 'pickup' && (!value || value.trim() === '')) {
        throw new Error('Shipping zip code is required for delivery orders');
      }
      return true;
    }),
  body('shipping.address.country')
    .optional()
    .custom((value, { req }) => {
      if (req.body.shipping?.method !== 'pickup' && (!value || value.trim() === '')) {
        throw new Error('Shipping country is required for delivery orders');
      }
      return true;
    }),
  // Custom validation to ensure either customer or dealer is provided
  body().custom((value, { req }) => {
    if (!req.body.customer && !req.body.dealer) {
      throw new Error('Either customer or dealer must be provided');
    }
    if (req.body.customer && req.body.dealer) {
      throw new Error('Cannot specify both customer and dealer');
    }
    return true;
  }),
  handleValidationErrors
], async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Validate customer or dealer exists
    let buyer = null;
    if (orderData.customer) {
      buyer = await Customer.findOne({
        _id: orderData.customer,
        ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
      });
      if (!buyer) {
        return res.status(400).json({
          success: false,
          message: 'Customer not found'
        });
      }
    } else if (orderData.dealer) {
      buyer = await Dealer.findOne({
        _id: orderData.dealer,
        ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
      });
      if (!buyer) {
        return res.status(400).json({
          success: false,
          message: 'Dealer not found'
        });
      }
    }

    // Validate products exist and calculate pricing
    let subtotal = 0;
    for (let item of orderData.items) {
      const product = await Product.findOne({
        _id: item.product,
        ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
      });
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

    // Calculate totals - preserve frontend pricing fields and ensure correct total calculation
    const originalPricing = orderData.pricing || {};
    
    // Calculate base total before global discounts and adjustments
    let calculatedTotal = subtotal - (originalPricing.discount || 0) + (originalPricing.tax || 0) + (originalPricing.shipping || 0);
    
    // Apply global discount if frontend total is not provided
    let globalDiscountAmount = 0;
    if (originalPricing.globalDiscountType === 'percentage') {
      globalDiscountAmount = (calculatedTotal * (originalPricing.globalDiscount || 0)) / 100;
    } else {
      globalDiscountAmount = originalPricing.globalDiscount || 0;
    }
    
    // Apply custom adjustment if frontend total is not provided
    let customAdjustmentAmount = 0;
    if (originalPricing.customAdjustment?.amount > 0) {
      if (originalPricing.customAdjustment.type === 'percentage') {
        customAdjustmentAmount = (calculatedTotal * originalPricing.customAdjustment.amount) / 100;
      } else {
        customAdjustmentAmount = originalPricing.customAdjustment.amount;
      }
    }
    
    // Final total includes all discounts and adjustments
    const finalTotal = calculatedTotal - globalDiscountAmount - customAdjustmentAmount;
    
    orderData.pricing = {
      subtotal,
      discount: originalPricing.discount || 0,
      tax: originalPricing.tax || 0,
      shipping: originalPricing.shipping || 0,
      total: originalPricing.total || finalTotal, // Use calculated total that includes all discounts
      // Preserve frontend discount and adjustment fields
      globalDiscount: originalPricing.globalDiscount || 0,
      globalDiscountType: originalPricing.globalDiscountType || 'percentage',
      customAdjustment: originalPricing.customAdjustment || { text: '', amount: 0, type: 'fixed' }
    };

    // Set payment due amount
    orderData.payment.dueAmount = orderData.pricing.total - (orderData.payment.paidAmount || 0);

    const order = await Order.create(orderData);

    // Process inventory and dealer balance
    const inventoryResult = await inventoryService.processOrder({
      ...order.toObject(),
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      userId: req.user.id
    });

    if (!inventoryResult.success) {
      // If inventory processing fails, delete the created order
      await Order.findByIdAndDelete(order._id);
      return res.status(400).json({
        success: false,
        message: `Order creation failed: ${inventoryResult.message}`,
        error: inventoryResult
      });
    }

    // Populate the created order
    if (order.customer) {
      await order.populate('customer', 'personalInfo.firstName personalInfo.lastName businessInfo.companyName');
    }
    if (order.dealer) {
      await order.populate('dealer', 'name businessName dealerGroup');
    }
    await order.populate('items.product', 'name sku');
    await order.populate('createdBy', 'name email');

    // Update buyer statistics
    if (buyer && buyer.updateStatistics) {
      await buyer.updateStatistics(orderData.pricing.total);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
router.put('/:id/status', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid order ID'),
  sanitizeInput,
  body('status')
    .isIn([
      'pending', 'confirmed', 'processing', 'packed', 'shipped',
      'out-for-delivery', 'delivered', 'cancelled', 'returned', 'refunded'
    ])
    .withMessage('Invalid order status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status, notes } = req.body;

    let query = { _id: req.params.id, ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {}) };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = order.status;
    
    // Update status
    order.status = status;
    
    // Add timeline entry
    order.timeline.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      notes
    });

    // Process inventory based on status changes
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      // Cancel order - release reserved stock and credit dealer balance
      const cancelResult = await inventoryService.cancelOrder({
        ...order.toObject(),
        items: order.items.map(item => ({
          product: item.product,
          quantity: item.quantity
        })),
        userId: req.user.id
      });
      
      if (!cancelResult.success) {
        console.warn('Failed to process inventory for cancelled order:', cancelResult.message);
      }
    } else if (status === 'shipped' && previousStatus !== 'shipped') {
      // Commit reserved stock (move from reserved to actual consumption)
      const commitResult = await inventoryService.commitReservedStock(
        order.items.map(item => ({
          product: item.product,
          quantity: item.quantity
        })),
        order._id,
        order.shipping?.address?.warehouse || 'Warehouse A',
        req.user.id
      );
      
      if (!commitResult.success) {
        console.warn('Failed to commit reserved stock:', commitResult.message);
      }
    }

    // Update payment status based on order status
    if (status === 'delivered' && order.payment.method === 'cash') {
      order.payment.status = 'completed';
      order.payment.paidAmount = order.pricing.total;
      order.payment.paidAt = new Date();
      order.payment.dueAmount = 0;
    }

    await order.save();

    if (order.customer) {
      await order.populate('customer', 'personalInfo.firstName personalInfo.lastName');
    }
    if (order.dealer) {
      await order.populate('dealer', 'name businessName');
    }
    await order.populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
});

// @desc    Assign order to user
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin, Manager)
router.put('/:id/assign', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid order ID'),
  sanitizeInput,
  body('assignedTo')
    .isMongoId()
    .withMessage('Invalid user ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { assignedTo } = req.body;

    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const order = await Order.findOneAndUpdate(
      query,
      { assignedTo },
      { new: true }
    )
      .populate('customer', 'personalInfo.firstName personalInfo.lastName')
      .populate('dealer', 'name businessName')
      .populate('assignedTo', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order assigned successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning order'
    });
  }
});

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
// @access  Private
router.put('/:id/payment', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid order ID'),
  sanitizeInput,
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'partial', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  body('paidAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a positive number'),
  body('transactionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Transaction ID must be maximum 100 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status, paidAmount, transactionId } = req.body;

    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Initialize payment object if it doesn't exist
    if (!order.payment) {
      order.payment = {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
        dueAmount: order.pricing.total
      };
    }

    // Update payment information
    if (paidAmount !== undefined) {
      // Add the new payment to existing paid amount
      const newTotalPaid = (order.payment.paidAmount || 0) + paidAmount;
      order.payment.paidAmount = newTotalPaid;
      // Ensure dueAmount never goes below 0
      order.payment.dueAmount = Math.max(0, order.pricing.total - newTotalPaid);
      
      // Automatically determine payment status based on total amount paid
      if (newTotalPaid >= order.pricing.total) {
        order.payment.status = 'completed';
        order.payment.paidAt = new Date();
      } else if (newTotalPaid > 0) {
        order.payment.status = 'partial';
      } else {
        order.payment.status = 'pending';
      }
    } else {
      // If no paidAmount provided, use the status from request
      order.payment.status = status;
      if (status === 'completed') {
        order.payment.paidAt = new Date();
      }
    }
    
    if (transactionId) {
      order.payment.transactionId = transactionId;
    }

    await order.save();

    if (order.customer) {
      await order.populate('customer', 'personalInfo.firstName personalInfo.lastName');
    }
    if (order.dealer) {
      await order.populate('dealer', 'name businessName');
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    });
  }
});

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid order ID'),
  sanitizeInput,
  handleValidationErrors
], async (req, res) => {
  try {
    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    // Get the original order first
    const originalOrder = await Order.findOne(query);
    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is in a state that allows modification
    if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(originalOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify order in current status'
      });
    }

    // Debug: Log the request body to understand what frontend is sending
    console.log('Order update request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body keys:', Object.keys(req.body));
    
    // Check if items are being updated
    const isItemsUpdate = req.body.items && Array.isArray(req.body.items);
    
    // Check if this is just a status update (more flexible detection)
    const bodyKeys = Object.keys(req.body);
    const nonInventoryFields = ['status', 'notes', 'priority', 'assignedTo', 'payment', 'shipping'];
    const hasInventoryFields = bodyKeys.some(key => !nonInventoryFields.includes(key) && key !== 'items');
    const isStatusOnlyUpdate = req.body.status && !isItemsUpdate && !hasInventoryFields;
    
    console.log('Update type detection:', {
      isItemsUpdate,
      isStatusOnlyUpdate,
      hasInventoryFields,
      bodyKeys
    });
    
    // Handle status-only updates (like marking as completed)
    if (isStatusOnlyUpdate) {
      const previousStatus = originalOrder.status;
      const newStatus = req.body.status;
      
      // Process inventory based on status changes
      if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
        // Cancel order - release reserved stock and credit dealer balance
        const cancelResult = await inventoryService.cancelOrder({
          ...originalOrder.toObject(),
          items: originalOrder.items.map(item => ({
            product: item.product,
            quantity: item.quantity
          })),
          userId: req.user.id
        });
        
        if (!cancelResult.success) {
          console.warn('Failed to process inventory for cancelled order:', cancelResult.message);
        }
      } else if (['shipped', 'delivered', 'completed'].includes(newStatus) && !['shipped', 'delivered', 'completed'].includes(previousStatus)) {
        // Commit reserved stock (move from reserved to actual consumption)
        const commitResult = await inventoryService.commitReservedStock(
          originalOrder.items.map(item => ({
            product: item.product,
            quantity: item.quantity
          })),
          originalOrder._id,
          originalOrder.shipping?.address?.warehouse || 'Warehouse A',
          req.user.id
        );
        
        if (!commitResult.success) {
          console.warn('Failed to commit reserved stock:', commitResult.message);
        }
      }
      
      // Add timeline entry for status change
      if (newStatus !== previousStatus) {
        const updatedOrder = await Order.findOneAndUpdate(
          query,
          { 
            ...req.body, 
            updatedBy: req.user.id,
            $push: {
              timeline: {
                status: newStatus,
                timestamp: new Date(),
                updatedBy: req.user.id,
                notes: req.body.notes || `Status changed to ${newStatus}`
              }
            }
          },
          { new: true }
        )
        .populate('customer', 'personalInfo.firstName personalInfo.lastName businessInfo.companyName')
        .populate('dealer', 'name businessName dealerGroup')
        .populate('items.product', 'name sku')
        .populate('createdBy', 'name email');

        return res.json({
          success: true,
          message: 'Order status updated successfully',
          data: { order: updatedOrder }
        });
      }
    } else if (isItemsUpdate) {
      // Handle inventory changes for item updates
      const originalItems = originalOrder.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }));
      
      const newItems = req.body.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }));
      
      // Check if items actually changed
      const itemsChanged = JSON.stringify(originalItems.sort((a, b) => a.product.toString().localeCompare(b.product.toString()))) !== 
                          JSON.stringify(newItems.sort((a, b) => a.product.toString().localeCompare(b.product.toString())));
      
      console.log('Items comparison:', {
        originalItems,
        newItems,
        itemsChanged
      });
      
      if (!itemsChanged) {
        console.log('Items unchanged, skipping inventory operations');
        // Items haven't changed, skip inventory operations
      } else {

      // First, release the original stock reservation
      const warehouse = originalOrder.shipping?.address?.warehouse || 'Warehouse A';
      await inventoryService.releaseReservedStock(
        originalItems, 
        originalOrder._id, 
        warehouse, 
        req.user.id
      );

      // Check stock availability for new items
      const productIds = newItems.map(item => item.product);
      const tenantId = req.user.role !== 'super_admin' ? req.tenant.id : null;
      const stockAvailability = await inventoryService.getStockAvailability(productIds, warehouse, tenantId);
      
      // Check if all items have sufficient stock (accounting for released stock from original order)
      const stockCheck = newItems.map(item => {
        const stockInfo = stockAvailability.find(stock => stock.productId.toString() === item.product);
        
        if (!stockInfo) {
          return {
            productId: item.product,
            requestedQuantity: item.quantity,
            available: 0,
            hasStock: false
          };
        }
        
        // Add back the stock that was released from the original order for this product
        const originalItem = originalItems.find(orig => orig.product.toString() === item.product);
        const releasedStock = originalItem ? originalItem.quantity : 0;
        const adjustedAvailable = stockInfo.available + releasedStock;
        
        return {
          productId: item.product,
          requestedQuantity: item.quantity,
          available: adjustedAvailable,
          originalAvailable: stockInfo.available,
          releasedFromOriginal: releasedStock,
          hasStock: adjustedAvailable >= item.quantity
        };
      });

      const insufficientStock = stockCheck.filter(check => !check.hasStock);
      
      if (insufficientStock.length > 0) {
        // Re-reserve the original stock since the update failed
        await inventoryService.reserveStock(
          originalItems, 
          originalOrder._id, 
          warehouse, 
          req.user.id
        );

        // Get product names for error message
        const productNames = await Product.find({
          _id: { $in: insufficientStock.map(item => item.productId) }
        }).select('name');

        const errorMessages = insufficientStock.map(item => {
          const product = productNames.find(p => p._id.toString() === item.productId);
          return `${product?.name || item.productId}: Only ${item.available} units available, ${item.requestedQuantity} requested`;
        });

        return res.status(400).json({
          success: false,
          message: `Cannot update order due to insufficient stock:\n\n${errorMessages.join('\n')}`,
          insufficientStock
        });
      }

      // Reserve stock for new items
      const stockResult = await inventoryService.reserveStock(
        newItems, 
        originalOrder._id, 
        warehouse, 
        req.user.id
      );

      if (!stockResult.success) {
        // Re-reserve the original stock since the update failed
        await inventoryService.reserveStock(
          originalItems, 
          originalOrder._id, 
          warehouse, 
          req.user.id
        );

        return res.status(400).json({
          success: false,
          message: `Stock reservation failed: ${stockResult.message}`
        });
      }
      } // Close the else block for itemsChanged
    }

    // Transform notes field if it's nested
    let updateData = { ...req.body, updatedBy: req.user.id };
    if (updateData.notes && typeof updateData.notes === 'object') {
      // Handle nested notes structure from frontend
      updateData.notes = {
        customer: typeof updateData.notes.customer === 'object' ? 
          updateData.notes.customer?.customer || '' : 
          updateData.notes.customer || '',
        internal: updateData.notes.internal || '',
        delivery: updateData.notes.delivery || ''
      };
    }

    // Update the order
    const updatedOrder = await Order.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'personalInfo.firstName personalInfo.lastName businessInfo.companyName')
      .populate('dealer', 'name businessName dealerGroup')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order'
    });
  }
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Admin, Manager)
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    let query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be deleted (only pending orders can be deleted)
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be deleted'
      });
    }

    // Release reserved stock before deleting the order
    console.log(`Releasing reserved stock for deleted order ${order._id}`);
    const cancelResult = await inventoryService.cancelOrder({
      ...order.toObject(),
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      userId: req.user.id
    });

    if (!cancelResult.success) {
      console.warn('Failed to release stock for deleted order:', cancelResult.message);
      // Continue with deletion anyway, but log the issue
    } else {
      console.log('✓ Stock released successfully for deleted order');
    }

    await Order.findOneAndDelete(query);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order'
    });
  }
});

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private (Admin, Manager)
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const stats = await Order.aggregate([
      ...(req.user.role !== 'super_admin' ? [{ $match: { tenantId: req.tenant.id } }] : []),
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed']] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const statusStats = await Order.aggregate([
      ...(req.user.role !== 'super_admin' ? [{ $match: { tenantId: req.tenant.id } }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orderStats: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0
        },
        statusStats
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order statistics'
    });
  }
});

module.exports = router;
