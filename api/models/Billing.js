const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    uppercase: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'basic', 'professional', 'enterprise'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired', 'past_due'],
      default: 'active'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    nextBillingDate: {
      type: Date,
      required: true
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'razorpay'],
      default: 'credit_card'
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  invoices: [{
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft'
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidDate: Date,
    paymentMethod: String,
    transactionId: String,
    downloadUrl: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  usage: {
    currentPeriod: {
      users: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      storage: { type: Number, default: 0 }, // in MB
      apiCalls: { type: Number, default: 0 }
    },
    limits: {
      users: { type: Number, default: 5 },
      products: { type: Number, default: 100 },
      orders: { type: Number, default: 1000 },
      storage: { type: Number, default: 1000 }, // in MB
      apiCalls: { type: Number, default: 10000 }
    },
    overageCharges: {
      users: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 }
    }
  },
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      required: true
    },
    paymentMethod: String,
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    processedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  notifications: {
    paymentReminders: {
      type: Boolean,
      default: true
    },
    usageAlerts: {
      type: Boolean,
      default: true
    },
    invoiceEmails: {
      type: Boolean,
      default: true
    },
    lastReminderSent: Date,
    lastUsageAlert: Date
  },
  metadata: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    razorpayCustomerId: String,
    razorpaySubscriptionId: String,
    customFields: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better performance
billingSchema.index({ company: 1 });
billingSchema.index({ tenantId: 1 });
billingSchema.index({ 'subscription.status': 1 });
billingSchema.index({ 'subscription.nextBillingDate': 1 });
billingSchema.index({ 'invoices.status': 1 });
billingSchema.index({ 'invoices.dueDate': 1 });

// Pre-save middleware to calculate final amounts
billingSchema.pre('save', function(next) {
  // Calculate discount amount if percentage is provided
  if (this.pricing.discountPercent > 0) {
    this.pricing.discountAmount = (this.pricing.basePrice * this.pricing.discountPercent) / 100;
  }
  
  // Calculate final amount after discount
  this.pricing.finalAmount = this.pricing.basePrice - this.pricing.discountAmount;
  
  // Calculate tax amount
  if (this.pricing.taxRate > 0) {
    this.pricing.taxAmount = (this.pricing.finalAmount * this.pricing.taxRate) / 100;
  }
  
  // Calculate total amount
  this.pricing.totalAmount = this.pricing.finalAmount + this.pricing.taxAmount;
  
  next();
});

// Method to check if subscription is active
billingSchema.methods.isSubscriptionActive = function() {
  return this.subscription.status === 'active' && 
         this.subscription.endDate > new Date();
};

// Method to check usage limits
billingSchema.methods.checkUsageLimit = function(resource) {
  const current = this.usage.currentPeriod[resource] || 0;
  const limit = this.usage.limits[resource] || 0;
  
  return {
    current,
    limit,
    remaining: Math.max(0, limit - current),
    isOverLimit: current >= limit,
    usagePercentage: limit > 0 ? Math.round((current / limit) * 100) : 0
  };
};

// Method to update usage
billingSchema.methods.updateUsage = function(resource, increment = 1) {
  if (!this.usage.currentPeriod[resource]) {
    this.usage.currentPeriod[resource] = 0;
  }
  this.usage.currentPeriod[resource] += increment;
  
  // Check for overage
  const limit = this.usage.limits[resource] || 0;
  if (this.usage.currentPeriod[resource] > limit) {
    const overage = this.usage.currentPeriod[resource] - limit;
    this.usage.overageCharges[resource] = overage;
  }
  
  return this.save();
};

// Method to reset usage for new billing period
billingSchema.methods.resetUsage = function() {
  this.usage.currentPeriod = {
    users: 0,
    products: 0,
    orders: 0,
    storage: 0,
    apiCalls: 0
  };
  this.usage.overageCharges = {
    users: 0,
    products: 0,
    orders: 0,
    storage: 0,
    apiCalls: 0
  };
  return this.save();
};

// Method to generate invoice number
billingSchema.methods.generateInvoiceNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
};

// Method to add invoice
billingSchema.methods.addInvoice = function(amount, dueDate) {
  const invoice = {
    invoiceNumber: this.generateInvoiceNumber(),
    amount,
    dueDate,
    status: 'sent'
  };
  
  this.invoices.push(invoice);
  return this.save();
};

// Virtual for days until next billing
billingSchema.virtual('daysUntilNextBilling').get(function() {
  if (this.subscription.nextBillingDate) {
    const now = new Date();
    const nextBilling = new Date(this.subscription.nextBillingDate);
    const diffTime = nextBilling - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
  return 0;
});

// Virtual for overdue invoices
billingSchema.virtual('overdueInvoices').get(function() {
  const now = new Date();
  return this.invoices.filter(invoice => 
    invoice.status !== 'paid' && 
    invoice.status !== 'cancelled' && 
    invoice.dueDate < now
  );
});

// Ensure virtual fields are serialized
billingSchema.set('toJSON', { virtuals: true });
billingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Billing', billingSchema);
