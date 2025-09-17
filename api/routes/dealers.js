const express = require('express');
const { body, param } = require('express-validator');
const Dealer = require('../models/Dealer');
const DealerGroup = require('../models/DealerGroup');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all dealers
// @route   GET /api/dealers
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'dealerCode', 'businessName', 'financialInfo.currentBalance', 'createdAt']),
  validateSearch(['name', 'dealerCode', 'businessName', 'contactInfo.primaryPhone', 'contactInfo.email'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { dealerGroup, status, balanceType, city, state } = req.query;

    // Build query with tenant filter
    let query = req.tenantFilter || {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (dealerGroup) query.dealerGroup = dealerGroup;
    if (status) query.status = status;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (state) query['address.state'] = new RegExp(state, 'i');
    
    // Balance type filter
    // Negative balance = dealer has credit (we owe them)
    // Positive balance = dealer owes us (debit)
    if (balanceType) {
      if (balanceType === 'credit') {
        query['financialInfo.currentBalance'] = { $lt: 0 }; // Negative = Credit
      } else if (balanceType === 'debit') {
        query['financialInfo.currentBalance'] = { $gt: 0 }; // Positive = Debit
      } else if (balanceType === 'balanced') {
        query['financialInfo.currentBalance'] = 0;
      }
    }

    // Execute query
    const dealers = await Dealer.find(query)
      .populate('dealerGroup', 'name code color discountPercentage creditLimit creditDays')
      .populate('createdBy', 'name email')
      .sort(sort || { name: 1 })
      .limit(limit)
      .skip(skip);

    const total = await Dealer.countDocuments(query);

    res.json({
      success: true,
      data: {
        dealers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get dealers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealers'
    });
  }
});

// @desc    Get single dealer
// @route   GET /api/dealers/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const dealer = await Dealer.findOne(query)
      .populate('dealerGroup', 'name code color discountPercentage creditLimit creditDays commissionPercentage')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    res.json({
      success: true,
      data: { dealer }
    });
  } catch (error) {
    console.error('Get dealer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealer'
    });
  }
});

// @desc    Create new dealer
// @route   POST /api/dealers
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Dealer name must be between 1 and 100 characters'),
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Business name cannot be more than 150 characters'),
  body('dealerGroup')
    .isMongoId()
    .withMessage('Invalid dealer group ID'),
  body('contactInfo.primaryPhone')
    .matches(/^[0-9+\-\s()]{10,15}$/)
    .withMessage('Please provide a valid primary phone number'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('address.street')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Street address must be between 1 and 200 characters'),
  body('address.city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City must be between 1 and 50 characters'),
  body('address.state')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State must be between 1 and 50 characters'),
  body('address.postalCode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Please provide a valid 6-digit postal code'),
  body('financialInfo.openingBalance')
    .isFloat()
    .withMessage('Opening balance must be a number'),
  body('financialInfo.openingBalanceType')
    .isIn(['credit', 'debit'])
    .withMessage('Opening balance type must be either credit or debit'),
  body('financialInfo.creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  body('financialInfo.panNumber')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Please provide a valid PAN number'),
  body('financialInfo.gstNumber')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please provide a valid GST number'),
  handleValidationErrors
], async (req, res) => {
  try {
    
    // Verify dealer group exists
    const dealerGroup = await DealerGroup.findOne({
      _id: req.body.dealerGroup,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    });
    if (!dealerGroup) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dealer group'
      });
    }

    // Inherit group settings if not provided
    const dealerData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Ensure financialInfo exists
    if (!dealerData.financialInfo) {
      dealerData.financialInfo = {};
    }

    // Set defaults from dealer group
    if (!dealerData.financialInfo.creditLimit) {
      dealerData.financialInfo.creditLimit = dealerGroup.creditLimit || 0;
    }
    if (!dealerData.financialInfo.creditDays) {
      dealerData.financialInfo.creditDays = dealerGroup.creditDays || 0;
    }
    if (!dealerData.financialInfo.discountPercentage) {
      dealerData.financialInfo.discountPercentage = dealerGroup.discountPercentage || 0;
    }
    if (!dealerData.financialInfo.commissionPercentage) {
      dealerData.financialInfo.commissionPercentage = dealerGroup.commissionPercentage || 0;
    }

    // Ensure opening balance defaults
    if (dealerData.financialInfo.openingBalance === undefined) {
      dealerData.financialInfo.openingBalance = 0;
    }
    if (!dealerData.financialInfo.openingBalanceType) {
      dealerData.financialInfo.openingBalanceType = 'credit';
    }

    // Generate dealer code before creating
    if (!dealerData.dealerCode && dealerData.tenantId) {
      dealerData.dealerCode = await Dealer.generateDealerCode(dealerData.tenantId);
    }

    const dealer = await Dealer.create(dealerData);

    // Populate the created dealer
    await dealer.populate('dealerGroup', 'name code color');
    await dealer.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Dealer created successfully',
      data: { dealer }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Dealer with this ${field} already exists`
      });
    }

    console.error('Create dealer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating dealer'
    });
  }
});

// @desc    Update dealer
// @route   PUT /api/dealers/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Dealer name must be between 1 and 100 characters'),
  body('dealerGroup')
    .optional()
    .isMongoId()
    .withMessage('Invalid dealer group ID'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('financialInfo.panNumber')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Please provide a valid PAN number'),
  body('financialInfo.gstNumber')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please provide a valid GST number'),
  handleValidationErrors
], async (req, res) => {
  try {
    
    // Find the dealer first
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const dealer = await Dealer.findOne(query);
    
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    // Store the original values
    const originalOpeningBalance = dealer.financialInfo.openingBalance;
    const originalOpeningBalanceType = dealer.financialInfo.openingBalanceType;
    const originalCurrentBalance = dealer.financialInfo.currentBalance;

    // Update dealer fields (but preserve financial info unless explicitly updating it)
    const updateData = { ...req.body };
    
    // Check if this is a financial update (values actually changed) or just a regular update
    const isFinancialUpdate = updateData.financialInfo && 
      ((updateData.financialInfo.openingBalance !== undefined && 
        Number(updateData.financialInfo.openingBalance) !== Number(originalOpeningBalance)) ||
       (updateData.financialInfo.openingBalanceType !== undefined && 
        updateData.financialInfo.openingBalanceType !== originalOpeningBalanceType));
    
    if (updateData.financialInfo) {
      if (isFinancialUpdate) {
        // This is a financial update - preserve currentBalance but allow other changes
        delete updateData.financialInfo.currentBalance;
      } else {
        // This is not a financial update - completely ignore financialInfo from frontend
        delete updateData.financialInfo;
      }
    }
    
    Object.assign(dealer, updateData);

    // If opening balance or type changed, recalculate current balance
    // Use strict comparison with number conversion to avoid type issues
    const currentOpeningBalance = Number(dealer.financialInfo.openingBalance) || 0;
    const originalOpeningBalanceNum = Number(originalOpeningBalance) || 0;
    
    if (currentOpeningBalance !== originalOpeningBalanceNum || 
        dealer.financialInfo.openingBalanceType !== originalOpeningBalanceType) {
      
      const openingAmount = currentOpeningBalance;
      // Credit opening balance means dealer has advance payment (negative balance)
      // Debit opening balance means dealer owes money (positive balance)
      const balanceAdjustment = dealer.financialInfo.openingBalanceType === 'credit' 
        ? -openingAmount 
        : openingAmount;
      
      // Calculate the difference from the original opening balance
      const originalOpeningAmount = originalOpeningBalanceType === 'credit'
        ? -originalOpeningBalanceNum
        : originalOpeningBalanceNum;
      
      const balanceDifference = balanceAdjustment - originalOpeningAmount;
      
      // Update current balance by the difference
      dealer.financialInfo.currentBalance = originalCurrentBalance + balanceDifference;
    }

    // Save the dealer (this will trigger pre-save hooks for other validations)
    await dealer.save();

    // Populate the references
    await dealer.populate('dealerGroup', 'name code color discountPercentage creditLimit creditDays');
    await dealer.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Dealer updated successfully',
      data: { dealer }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Dealer with this ${field} already exists`
      });
    }

    console.error('Update dealer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating dealer'
    });
  }
});

// @desc    Delete dealer (deactivate)
// @route   DELETE /api/dealers/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const dealer = await Dealer.findOne(query);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    // Check if dealer has pending orders or outstanding balance
    const hasOutstandingBalance = dealer.financialInfo.currentBalance !== 0;
    
    if (hasOutstandingBalance) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete dealer with outstanding balance of ₹${Math.abs(dealer.financialInfo.currentBalance)}`
      });
    }

    // Soft delete - mark as inactive
    dealer.isActive = false;
    dealer.status = 'inactive';
    await dealer.save();

    res.json({
      success: true,
      message: 'Dealer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete dealer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting dealer'
    });
  }
});

// @desc    Update dealer balance
// @route   PUT /api/dealers/:id/balance
// @access  Private
router.put('/:id/balance', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer ID'),
  body('amount')
    .isFloat()
    .withMessage('Amount must be a number'),
  body('type')
    .isIn(['credit', 'debit'])
    .withMessage('Type must be either credit or debit'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot be more than 200 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { amount, type, description } = req.body;
    
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const dealer = await Dealer.findOne(query)
      .populate('dealerGroup', 'name code');

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    // Update balance with transaction record
    const transactionDescription = description || `Balance ${type} of ₹${amount}`;
    await dealer.updateBalance(amount, type, transactionDescription, req.user._id);

    res.json({
      success: true,
      message: 'Dealer balance updated successfully',
      data: { 
        dealer: {
          _id: dealer._id,
          name: dealer.name,
          currentBalance: dealer.financialInfo.currentBalance,
          balanceStatus: dealer.balanceStatus
        }
      }
    });
  } catch (error) {
    console.error('Update dealer balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating dealer balance'
    });
  }
});

// @desc    Add note to dealer
// @route   POST /api/dealers/:id/notes
// @access  Private
router.post('/:id/notes', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note content must be between 1 and 1000 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const dealer = await Dealer.findOne(query);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    await dealer.addNote(req.body.content, req.user._id);
    
    // Populate the new note
    await dealer.populate('notes.createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: { 
        note: dealer.notes[dealer.notes.length - 1]
      }
    });
  } catch (error) {
    console.error('Add dealer note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @desc    Get dealers by group
// @route   GET /api/dealers/group/:groupId
// @access  Private
router.get('/group/:groupId', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('groupId').isMongoId().withMessage('Invalid dealer group ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const dealers = await Dealer.getByGroup(req.params.groupId, { 
      isActive: isActive !== undefined ? isActive === 'true' : undefined 
    });

    res.json({
      success: true,
      data: { dealers }
    });
  } catch (error) {
    console.error('Get dealers by group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealers by group'
    });
  }
});

// @desc    Get dealer statistics
// @route   GET /api/dealers/meta/stats
// @access  Private
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const tenantQuery = req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {};
    const totalDealers = await Dealer.countDocuments(tenantQuery);
    const activeDealers = await Dealer.countDocuments({ ...tenantQuery, isActive: true });
    const inactiveDealers = totalDealers - activeDealers;

    // Balance statistics
    const balanceStats = await Dealer.aggregate([
      ...(req.user.role !== 'super_admin' ? [{ $match: { tenantId: req.tenant.id } }] : []),
      {
        $group: {
          _id: null,
          totalCredit: {
            $sum: {
              $cond: [
                { $gt: ['$financialInfo.currentBalance', 0] },
                '$financialInfo.currentBalance',
                0
              ]
            }
          },
          totalDebit: {
            $sum: {
              $cond: [
                { $lt: ['$financialInfo.currentBalance', 0] },
                { $abs: '$financialInfo.currentBalance' },
                0
              ]
            }
          },
          creditDealers: {
            $sum: {
              $cond: [{ $gt: ['$financialInfo.currentBalance', 0] }, 1, 0]
            }
          },
          debitDealers: {
            $sum: {
              $cond: [{ $lt: ['$financialInfo.currentBalance', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Top dealers by balance
    const topCreditDealers = await Dealer.find({
      ...tenantQuery,
      'financialInfo.currentBalance': { $gt: 0 }
    })
      .select('name dealerCode financialInfo.currentBalance')
      .populate('dealerGroup', 'name color')
      .sort({ 'financialInfo.currentBalance': -1 })
      .limit(5);

    const topDebitDealers = await Dealer.find({
      ...tenantQuery,
      'financialInfo.currentBalance': { $lt: 0 }
    })
      .select('name dealerCode financialInfo.currentBalance')
      .populate('dealerGroup', 'name color')
      .sort({ 'financialInfo.currentBalance': 1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          totalDealers,
          activeDealers,
          inactiveDealers,
          ...balanceStats[0]
        },
        topCreditDealers,
        topDebitDealers
      }
    });
  } catch (error) {
    console.error('Get dealer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealer statistics'
    });
  }
});

// @desc    Get dealer balance sheet
// @route   GET /api/dealers/:id/balance-sheet
// @access  Private
router.get('/:id/balance-sheet', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Find dealer with transactions
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const dealer = await Dealer.findOne(query)
      .populate('dealerGroup', 'name code color discountPercentage creditLimit creditDays');

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found'
      });
    }

    // Get orders within date range
    const Order = require('../models/Order');
    let orderQuery = { 
      dealer: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };
    
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
    // Credit opening balance means dealer has advance payment (negative balance)
    // Debit opening balance means dealer owes money (positive balance)
    const calculatedOpeningBalance = openingBalanceType === 'credit' ? -openingBalance : openingBalance;
    
    let runningBalance = calculatedOpeningBalance;
    
    transactions.push({
      id: 'opening',
      date: startDate || '2025-01-01',
      type: 'opening',
      description: `Opening Balance (${openingBalanceType})`,
      reference: 'System',
      debit: calculatedOpeningBalance > 0 ? Number(calculatedOpeningBalance.toFixed(2)) : 0,
      credit: calculatedOpeningBalance < 0 ? Number(Math.abs(calculatedOpeningBalance).toFixed(2)) : 0,
      balance: Number(calculatedOpeningBalance.toFixed(2)),
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
            runningBalance += transaction.amount;
          } else {
            runningBalance -= transaction.amount;
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
            debit: transaction.type === 'debit' ? Number(transaction.amount.toFixed(2)) : 0,
            credit: transaction.type === 'credit' ? Number(transaction.amount.toFixed(2)) : 0,
            balance: Number(runningBalance.toFixed(2)),
            status: 'completed',
            invoiceDetails: invoiceDetails
          });
        });
    }

    // NOTE: Orders are already included as transaction records via inventoryService.updateDealerBalance()
    // We don't need to add them separately as invoices to avoid double-counting
    
    // Add payment records for orders (if not already in dealer transactions)
    orders.forEach(order => {
      if (order.payment?.paidAmount > 0) {
        // Check if this payment is already recorded in dealer transactions
        const existingPayment = dealer.transactions?.find(t => 
          t.reference?.type === 'Order' && 
          t.reference?.id?.toString() === order._id.toString() && 
          t.type === 'credit' &&
          t.amount === order.payment.paidAmount
        );
        
        // Only add payment if not already recorded
        if (!existingPayment) {
          runningBalance -= order.payment.paidAmount;
          
          transactions.push({
            id: `${order._id}_payment`,
            date: order.payment.paymentDate || order.createdAt,
            type: 'payment',
            description: `Payment for #${order.orderNumber}`,
            reference: order.orderNumber,
            referenceType: 'Payment',
            debit: 0,
            credit: Number(order.payment.paidAmount.toFixed(2)),
            balance: Number(runningBalance.toFixed(2)),
            status: 'completed'
          });
        }
      }
    });

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate running balances after sorting
    let sortedBalance = calculatedOpeningBalance;
    transactions.forEach((transaction, index) => {
      if (index === 0) {
        transaction.balance = Number(sortedBalance.toFixed(2));
      } else {
        sortedBalance = sortedBalance + transaction.debit - transaction.credit;
        transaction.balance = Number(sortedBalance.toFixed(2));
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
      openingBalance: Number(calculatedOpeningBalance.toFixed(2)),
      totalDebits: Number(totalDebits.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
      closingBalance: Number(sortedBalance.toFixed(2)),
      totalInvoices,
      pendingAmount: Number(pendingAmount.toFixed(2))
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

module.exports = router;