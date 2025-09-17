const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const Company = require('../models/Company');
const { protect: auth } = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');
const { extractTenant, validateTenantAccess } = tenantMiddleware;

// Get billing dashboard stats (super admin only) - MUST BE BEFORE /:tenantId
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin access required.'
      });
    }

    const totalBillings = await Billing.countDocuments();
    const activeBillings = await Billing.countDocuments({ 'subscription.status': 'active' });
    const trialBillings = await Billing.countDocuments({ 'subscription.plan': 'trial' });
    
    // Calculate total revenue
    const revenueAgg = await Billing.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // Get overdue invoices count
    const overdueInvoices = await Billing.aggregate([
      { $unwind: '$invoices' },
      {
        $match: {
          'invoices.status': { $nin: ['paid', 'cancelled'] },
          'invoices.dueDate': { $lt: new Date() }
        }
      },
      { $count: 'total' }
    ]);

    const overdueCount = overdueInvoices.length > 0 ? overdueInvoices[0].total : 0;

    // Plan distribution
    const planDistribution = await Billing.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalBillings,
          activeBillings,
          trialBillings,
          totalRevenue,
          overdueInvoices: overdueCount
        },
        planDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing statistics'
    });
  }
});

// Get billing information for a tenant
router.get('/:tenantId', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check if user has access to this tenant or is super admin
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() })
      .populate('company', 'name contactInfo');

    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing information not found'
      });
    }

    res.json({
      success: true,
      data: billing
    });
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing information'
    });
  }
});

// Get all billing records (super admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin access required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.status) {
      filter['subscription.status'] = req.query.status;
    }
    if (req.query.plan) {
      filter['subscription.plan'] = req.query.plan;
    }
    if (req.query.search) {
      filter.tenantId = { $regex: req.query.search, $options: 'i' };
    }

    const billings = await Billing.find(filter)
      .populate('company', 'name contactInfo tenantId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Billing.countDocuments(filter);

    res.json({
      success: true,
      data: {
        billings,
        pagination: {
          current: page,
          pageSize: limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching billings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing records'
    });
  }
});

// Create billing record for a company
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin access required.'
      });
    }

    const {
      companyId,
      tenantId,
      plan,
      billingCycle,
      basePrice,
      currency,
      taxRate
    } = req.body;

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if billing already exists
    const existingBilling = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (existingBilling) {
      return res.status(400).json({
        success: false,
        message: 'Billing record already exists for this tenant'
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    const nextBillingDate = new Date();

    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Set usage limits based on plan
    const planLimits = {
      trial: { users: 5, products: 100, orders: 1000, storage: 1000, apiCalls: 10000 },
      basic: { users: 10, products: 500, orders: 5000, storage: 5000, apiCalls: 50000 },
      professional: { users: 50, products: 2000, orders: 20000, storage: 20000, apiCalls: 200000 },
      enterprise: { users: 200, products: 10000, orders: 100000, storage: 100000, apiCalls: 1000000 }
    };

    const billing = new Billing({
      company: companyId,
      tenantId: tenantId.toUpperCase(),
      subscription: {
        plan,
        status: 'active',
        billingCycle,
        startDate,
        endDate,
        nextBillingDate
      },
      pricing: {
        basePrice,
        currency: currency || 'USD',
        taxRate: taxRate || 0,
        finalAmount: basePrice,
        totalAmount: basePrice
      },
      usage: {
        limits: planLimits[plan] || planLimits.trial
      }
    });

    await billing.save();

    // Update company subscription info
    company.subscription.plan = plan;
    company.subscription.status = 'active';
    company.subscription.endDate = endDate;
    await company.save();

    res.status(201).json({
      success: true,
      message: 'Billing record created successfully',
      data: billing
    });
  } catch (error) {
    console.error('Error creating billing:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating billing record'
    });
  }
});

// Update billing/subscription
router.put('/:tenantId', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check permissions
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    const updates = req.body;
    
    // Update subscription details
    if (updates.subscription) {
      Object.assign(billing.subscription, updates.subscription);
    }
    
    // Update pricing
    if (updates.pricing) {
      Object.assign(billing.pricing, updates.pricing);
    }
    
    // Update usage limits
    if (updates.usage && updates.usage.limits) {
      Object.assign(billing.usage.limits, updates.usage.limits);
    }
    
    // Update payment method
    if (updates.paymentMethod) {
      Object.assign(billing.paymentMethod, updates.paymentMethod);
    }

    await billing.save();

    res.json({
      success: true,
      message: 'Billing updated successfully',
      data: billing
    });
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating billing record'
    });
  }
});

// Update usage for a tenant
router.post('/:tenantId/usage', auth, extractTenant, validateTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { resource, increment = 1 } = req.body;

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    await billing.updateUsage(resource, increment);

    res.json({
      success: true,
      message: 'Usage updated successfully',
      data: {
        usage: billing.usage,
        limits: billing.checkUsageLimit(resource)
      }
    });
  } catch (error) {
    console.error('Error updating usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating usage'
    });
  }
});

// Get usage statistics
router.get('/:tenantId/usage', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check permissions
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    const usageStats = {};
    const resources = ['users', 'products', 'orders', 'storage', 'apiCalls'];
    
    resources.forEach(resource => {
      usageStats[resource] = billing.checkUsageLimit(resource);
    });

    res.json({
      success: true,
      data: {
        usage: billing.usage,
        stats: usageStats,
        daysUntilNextBilling: billing.daysUntilNextBilling
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage statistics'
    });
  }
});

// Create invoice
router.post('/:tenantId/invoices', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin access required.'
      });
    }

    const { tenantId } = req.params;
    const { amount, dueDate, description } = req.body;

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    await billing.addInvoice(amount, new Date(dueDate));

    res.json({
      success: true,
      message: 'Invoice created successfully',
      data: billing.invoices[billing.invoices.length - 1]
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating invoice'
    });
  }
});

// Get invoices for a tenant
router.get('/:tenantId/invoices', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check permissions
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    const invoices = billing.invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: {
        invoices,
        overdueInvoices: billing.overdueInvoices
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices'
    });
  }
});

// Process payment
router.post('/:tenantId/payments', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { amount, paymentMethod, transactionId, invoiceId } = req.body;

    // Check permissions
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const billing = await Billing.findOne({ tenantId: tenantId.toUpperCase() });
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    // Add payment to history
    const payment = {
      amount,
      status: 'completed',
      paymentMethod,
      transactionId,
      description: invoiceId ? `Payment for invoice ${invoiceId}` : 'Manual payment'
    };

    billing.paymentHistory.push(payment);

    // Update invoice status if provided
    if (invoiceId) {
      const invoice = billing.invoices.id(invoiceId);
      if (invoice) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
        invoice.paymentMethod = paymentMethod;
        invoice.transactionId = transactionId;
      }
    }

    await billing.save();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment'
    });
  }
});

module.exports = router;
