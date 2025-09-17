const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerNumber: {
    type: String
  },
  type: {
    type: String,
    enum: ['individual', 'business', 'distributor', 'retailer'],
    default: 'individual'
  },
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    phone: {
      primary: {
        type: String,
        required: [true, 'Primary phone is required'],
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
      },
      secondary: {
        type: String,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
      }
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    }
  },
  businessInfo: {
    companyName: String,
    businessType: {
      type: String,
      enum: ['restaurant', 'cafe', 'grocery-store', 'supermarket', 'distributor', 'other']
    },
    taxId: String,
    licenseNumber: String,
    website: String,
    establishedYear: Number
  },
  addresses: [{
    type: {
      type: String,
      enum: ['billing', 'shipping', 'both'],
      default: 'both'
    },
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'India'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    deliveryInstructions: String
  }],
  preferences: {
    preferredDeliveryTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'anytime']
    },
    deliveryFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'as-needed']
    },
    preferredProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    specialRequirements: String,
    communicationPreference: {
      type: String,
      enum: ['email', 'sms', 'phone', 'whatsapp'],
      default: 'email'
    }
  },
  financialInfo: {
    openingBalance: {
      type: Number,
      default: 0
    },
    openingBalanceType: {
      type: String,
      enum: ['credit', 'debit'],
      default: 'debit'
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative']
    },
    creditDays: {
      type: Number,
      default: 0,
      min: [0, 'Credit days cannot be negative']
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100%']
    }
  },
  creditInfo: {
    availableCredit: {
      type: Number,
      default: 0
    },
    paymentTerms: {
      type: String,
      enum: ['immediate', 'net-7', 'net-15', 'net-30', 'net-60'],
      default: 'immediate'
    },
    creditScore: {
      type: Number,
      min: 0,
      max: 100
    },
    lastCreditReview: Date
  },
  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit', 'payment', 'adjustment', 'refund'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    reference: {
      type: {
        type: String,
        enum: ['Order', 'Invoice', 'Payment', 'Manual', 'Refund', 'Adjustment']
      },
      id: mongoose.Schema.Types.ObjectId
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blacklisted'],
    default: 'active'
  },
  loyaltyProgram: {
    isEnrolled: {
      type: Boolean,
      default: false
    },
    points: {
      type: Number,
      default: 0,
      min: [0, 'Points cannot be negative']
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    enrollmentDate: Date
  },
  statistics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    firstOrderDate: Date
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  tags: [String],
  assignedSalesperson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  lastContactDate: Date,
  nextFollowUpDate: Date
}, {
  timestamps: true
});

// Indexes for better query performance
customerSchema.index({ customerNumber: 1, tenantId: 1 }, { unique: true }); // Composite unique index
customerSchema.index({ 'personalInfo.email': 1, tenantId: 1 }, { unique: true }); // Composite unique index
customerSchema.index({ 'personalInfo.phone.primary': 1 });
customerSchema.index({ type: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ assignedSalesperson: 1 });
customerSchema.index({ 'businessInfo.companyName': 'text', 'personalInfo.firstName': 'text', 'personalInfo.lastName': 'text' });
customerSchema.index({ tenantId: 1 }); // Tenant isolation index

// Pre-save middleware to generate customer number
customerSchema.pre('save', async function(next) {
  if (this.isNew && !this.customerNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Find the last customer of the month for this tenant
    const lastCustomer = await this.constructor.findOne({
      customerNumber: new RegExp(`^CUST${year}${month}`),
      tenantId: this.tenantId
    }).sort({ customerNumber: -1 });
    
    let sequence = 1;
    if (lastCustomer) {
      const lastSequence = parseInt(lastCustomer.customerNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    this.customerNumber = `CUST${year}${month}${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Pre-save middleware to ensure only one default address
customerSchema.pre('save', function(next) {
  if (this.addresses && this.addresses.length > 0) {
    let defaultCount = 0;
    this.addresses.forEach(address => {
      if (address.isDefault) defaultCount++;
    });
    
    if (defaultCount === 0) {
      this.addresses[0].isDefault = true;
    } else if (defaultCount > 1) {
      let firstDefault = true;
      this.addresses.forEach(address => {
        if (address.isDefault && firstDefault) {
          firstDefault = false;
        } else if (address.isDefault) {
          address.isDefault = false;
        }
      });
    }
  }
  next();
});

// Pre-save middleware to handle opening balance setup
customerSchema.pre('save', function(next) {
  // Set up opening balance for new customers
  if (this.isNew && this.financialInfo) {
    const openingAmount = this.financialInfo.openingBalance || 0;
    
    // Set current balance based on opening balance type
    this.financialInfo.currentBalance = this.financialInfo.openingBalanceType === 'credit' 
      ? -Math.abs(openingAmount)  // Credit balance is negative
      : Math.abs(openingAmount);  // Debit balance is positive
  }
  
  // Ensure currentBalance is set even if it's undefined, but only for new customers or when balance is truly undefined
  if (this.financialInfo && (this.isNew || typeof this.financialInfo.currentBalance === 'undefined')) {
    this.financialInfo.currentBalance = this.financialInfo.currentBalance || 0;
  }
  
  next();
});

// Pre-save middleware to calculate available credit
customerSchema.pre('save', function(next) {
  // This would typically be calculated based on outstanding orders/invoices
  // For now, we'll just ensure it doesn't exceed credit limit
  if (this.creditInfo.availableCredit > this.financialInfo.creditLimit) {
    this.creditInfo.availableCredit = this.financialInfo.creditLimit;
  }
  next();
});

// Virtual for balance status
customerSchema.virtual('balanceStatus').get(function() {
  if (!this.financialInfo) return 'none';
  const balance = this.financialInfo.currentBalance;
  if (balance < 0) return 'credit';
  if (balance > 0) return 'debit';
  return 'clear';
});

// Virtual for credit utilization percentage
customerSchema.virtual('creditUtilization').get(function() {
  if (!this.financialInfo) return 0;
  const { currentBalance, creditLimit } = this.financialInfo;
  if (!creditLimit || creditLimit <= 0) return 0;
  return Math.abs(currentBalance) / creditLimit * 100;
});

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for display name (business name or full name)
customerSchema.virtual('displayName').get(function() {
  if (this.type === 'business' && this.businessInfo.companyName) {
    return this.businessInfo.companyName;
  }
  return this.fullName;
});

// Virtual for customer age in days
customerSchema.virtual('customerAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for default address
customerSchema.virtual('defaultAddress').get(function() {
  return this.addresses.find(address => address.isDefault) || this.addresses[0];
});

// Ensure virtual fields are serialized
customerSchema.set('toJSON', { virtuals: true });

// Method to add loyalty points
customerSchema.methods.addLoyaltyPoints = function(points) {
  this.loyaltyProgram.points += points;
  
  // Update tier based on points
  if (this.loyaltyProgram.points >= 10000) {
    this.loyaltyProgram.tier = 'platinum';
  } else if (this.loyaltyProgram.points >= 5000) {
    this.loyaltyProgram.tier = 'gold';
  } else if (this.loyaltyProgram.points >= 1000) {
    this.loyaltyProgram.tier = 'silver';
  }
  
  return this.save();
};

// Method to update statistics
customerSchema.methods.updateStatistics = function(orderValue) {
  this.statistics.totalOrders += 1;
  this.statistics.totalSpent += orderValue;
  this.statistics.averageOrderValue = this.statistics.totalSpent / this.statistics.totalOrders;
  this.statistics.lastOrderDate = new Date();
  
  if (!this.statistics.firstOrderDate) {
    this.statistics.firstOrderDate = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
