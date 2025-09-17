const mongoose = require('mongoose');

const dealerSchema = new mongoose.Schema({
  dealerCode: {
    type: String,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Dealer code cannot be more than 20 characters']
  },
  name: {
    type: String,
    required: [true, 'Dealer name is required'],
    trim: true,
    maxlength: [100, 'Dealer name cannot be more than 100 characters']
  },
  businessName: {
    type: String,
    trim: true,
    maxlength: [150, 'Business name cannot be more than 150 characters']
  },
  dealerGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DealerGroup',
    required: [true, 'Dealer group is required']
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  contactInfo: {
    primaryPhone: {
      type: String,
      required: [true, 'Primary phone is required'],
      match: [/^[0-9+\-\s()]{10,15}$/, 'Please provide a valid phone number']
    },
    secondaryPhone: {
      type: String,
      match: [/^[0-9+\-\s()]{10,15}$/, 'Please provide a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    whatsapp: {
      type: String,
      match: [/^[0-9+\-\s()]{10,15}$/, 'Please provide a valid WhatsApp number']
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      maxlength: [200, 'Street address cannot be more than 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      maxlength: [50, 'City cannot be more than 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      maxlength: [50, 'State cannot be more than 50 characters']
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit postal code']
    },
    country: {
      type: String,
      default: 'India',
      maxlength: [50, 'Country cannot be more than 50 characters']
    },
    landmark: {
      type: String,
      maxlength: [100, 'Landmark cannot be more than 100 characters']
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
      default: 'credit'
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    creditLimit: {
      type: Number,
      min: [0, 'Credit limit cannot be negative'],
      default: 0
    },
    creditDays: {
      type: Number,
      min: [0, 'Credit days cannot be negative'],
      default: 0
    },
    discountPercentage: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100%'],
      default: 0
    },
    commissionPercentage: {
      type: Number,
      min: [0, 'Commission percentage cannot be negative'],
      max: [100, 'Commission percentage cannot exceed 100%'],
      default: 0
    },
    panNumber: {
      type: String,
      uppercase: true,
      validate: {
        validator: function(v) {
          // Allow empty or undefined values
          if (!v || v.trim() === '') return true;
          // Validate pattern only when value exists
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: 'Please provide a valid PAN number'
      }
    },
    gstNumber: {
      type: String,
      uppercase: true,
      validate: {
        validator: function(v) {
          // Allow empty or undefined values
          if (!v || v.trim() === '') return true;
          // Validate pattern only when value exists
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Please provide a valid GST number'
      }
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: {
        type: String,
        uppercase: true,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code']
      },
      bankName: String,
      branchName: String
    }
  },
  preferences: {
    paymentTerms: {
      type: String,
      enum: ['cash', 'credit', 'mixed'],
      default: 'cash'
    },
    deliveryMode: {
      type: String,
      enum: ['pickup', 'delivery', 'both'],
      default: 'both'
    },
    preferredDeliveryTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'flexible'],
      default: 'flexible'
    }
  },
  documents: [{
    type: {
      type: String,
      enum: ['pan', 'gst', 'license', 'agreement', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot be more than 1000 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastOrderDate: {
    type: Date
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalOrderValue: {
    type: Number,
    default: 0
  },
  joinDate: {
    type: Date,
    default: Date.now
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
  transactions: [{
    type: {
      type: String,
      enum: ['debit', 'credit', 'adjustment'],
      required: true
    },
    amount: {  
      type: Number,
      required: true,
      min: [0, 'Transaction amount cannot be negative']
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    reference: {
      type: {
        type: String,
        required: false,  // Make optional
        validate: {
          validator: function(v) {
            // Allow null, undefined, or valid enum values
            return v === null || v === undefined || ['Order', 'Payment', 'Adjustment', 'Opening Balance', 'System', 'Manual', 'Migration', 'Correction'].includes(v);
          },
          message: 'Reference type must be one of: Order, Payment, Adjustment, Opening Balance, System, Manual, Migration, Correction'
        }
      },
      id: {
        type: mongoose.Schema.Types.Mixed,  // Allow both ObjectId and String for flexibility
        required: false,  // Make optional
        default: null
      }
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes cannot exceed 200 characters']
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
dealerSchema.index({ dealerCode: 1, tenantId: 1 }, { unique: true }); // Composite unique index
dealerSchema.index({ name: 'text', businessName: 'text' });
dealerSchema.index({ dealerGroup: 1 });
dealerSchema.index({ route: 1 });
dealerSchema.index({ status: 1 });
dealerSchema.index({ isActive: 1 });
dealerSchema.index({ 'contactInfo.primaryPhone': 1 });
dealerSchema.index({ 'contactInfo.email': 1 });
dealerSchema.index({ 'address.city': 1 });
dealerSchema.index({ 'address.state': 1 });
dealerSchema.index({ createdBy: 1 });
dealerSchema.index({ tenantId: 1 }); // Tenant isolation index

// Virtual for full address
dealerSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} - ${addr.postalCode}`;
});

// Virtual for balance status
dealerSchema.virtual('balanceStatus').get(function() {
  const balance = this.financialInfo.currentBalance;
  if (balance > 0) return 'debit';   // Positive = dealer owes us
  if (balance < 0) return 'credit';  // Negative = dealer has credit with us
  return 'balanced';
});

// Virtual for credit utilization
dealerSchema.virtual('creditUtilization').get(function() {
  const { currentBalance, creditLimit } = this.financialInfo;
  if (creditLimit === 0) return 0;
  return Math.abs(currentBalance) / creditLimit * 100;
});
 
// Ensure virtual fields are serialized
dealerSchema.set('toJSON', { virtuals: true });
dealerSchema.set('toObject', { virtuals: true });

// Pre-save middleware to generate dealer code if not provided
dealerSchema.pre('save', async function(next) {
  if (!this.dealerCode && this.tenantId) {
    this.dealerCode = await this.constructor.generateDealerCode(this.tenantId);
  }
  
  // Set current balance to opening balance for new dealers
  if (this.isNew) {
    const openingAmount = this.financialInfo.openingBalance || 0;
    // Credit opening balance means dealer has advance payment (negative balance - dealer has credit)
    // Debit opening balance means dealer owes money (positive balance - dealer owes us)
    this.financialInfo.currentBalance = this.financialInfo.openingBalanceType === 'credit' 
      ? -openingAmount 
      : openingAmount;
  }
  
  // Ensure currentBalance is set even if it's undefined, but only for new dealers or when balance is truly undefined
  if (this.isNew && (this.financialInfo.currentBalance === undefined || this.financialInfo.currentBalance === null)) {
    this.financialInfo.currentBalance = 0;
  }
  
  // For existing dealers, never reset currentBalance to 0 unless it was explicitly set to 0
  if (!this.isNew && (this.financialInfo.currentBalance === undefined || this.financialInfo.currentBalance === null)) {
    // This should not happen - log a warning and preserve the balance
    console.warn(`Warning: currentBalance was undefined for existing dealer ${this._id}. This indicates a data integrity issue.`);
    // Don't reset to 0 - keep it undefined and let the database preserve the existing value
  }
  
  next();
});

// Post-save middleware to update dealer group and route counts
dealerSchema.post('save', async function() {
  const DealerGroup = mongoose.model('DealerGroup');
  const Route = mongoose.model('Route');
  
  // Update dealer group count
  const group = await DealerGroup.findById(this.dealerGroup);
  if (group) {
    await group.updateDealerCount();
  }
  
  // Update route dealer count
  if (this.route) {
    const route = await Route.findById(this.route);
    if (route) {
      await route.updateDealerCount();
    }
  }
});

// Static method to generate dealer code
dealerSchema.statics.generateDealerCode = async function(tenantId) {
  try {
    if (!tenantId) {
      throw new Error('TenantId is required to generate dealer code');
    }
    
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      // Find the last dealer code for current month in this tenant
      const lastDealer = await this.findOne({
        dealerCode: new RegExp(`^DLR${year}${month}`),
        tenantId: tenantId
      }).sort({ dealerCode: -1 }).exec();
      
      let sequence = 1;
      if (lastDealer && lastDealer.dealerCode) {
        const lastSequence = parseInt(lastDealer.dealerCode.slice(-3));
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
      
      const newCode = `DLR${year}${month}${sequence.toString().padStart(3, '0')}`;
      
      // Check if this code already exists in this tenant
      const existingDealer = await this.findOne({ 
        dealerCode: newCode,
        tenantId: tenantId 
      });
      if (!existingDealer) {
        return newCode;
      }
      
      attempts++;
    }
    
    // If we couldn't generate a unique code, use timestamp and tenant prefix
    const timestamp = Date.now().toString().slice(-6);
    return `DLR${tenantId.slice(0, 3).toUpperCase()}${timestamp}`;
    
  } catch (error) {
    console.error('Error generating dealer code:', error);
    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-6);
    return `DLR${timestamp}`;
  }
};

// Static method to get dealers by group
dealerSchema.statics.getByGroup = function(groupId, options = {}) {
  const query = { dealerGroup: groupId };
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  
  return this.find(query)
    .populate('dealerGroup', 'name code color')
    .populate('createdBy', 'name email')
    .sort(options.sort || 'name');
};

// Method to update balance
dealerSchema.methods.updateBalance = function(amount, type = 'credit', description = 'Manual balance adjustment', userId = null) {
  // Ensure currentBalance exists and is a number
  if (this.financialInfo.currentBalance === undefined || this.financialInfo.currentBalance === null || isNaN(this.financialInfo.currentBalance)) {
    this.financialInfo.currentBalance = 0;
  }
  
  const previousBalance = Number(this.financialInfo.currentBalance);
  const adjustmentAmount = Number(amount);
  
  if (type === 'credit') {
    this.financialInfo.currentBalance = previousBalance - adjustmentAmount;
  } else {
    this.financialInfo.currentBalance = previousBalance + adjustmentAmount;
  }
  
  // Create transaction record
  this.transactions.push({
    type: type,
    amount: adjustmentAmount,
    description: description,
    reference: {
      type: 'Manual',
      id: null
    },
    balanceAfter: this.financialInfo.currentBalance,
    date: new Date(),
    createdBy: userId,
    notes: `Previous balance: ₹${previousBalance}, New balance: ₹${this.financialInfo.currentBalance}`
  });
  
  return this.save();
};

// Method to add note
dealerSchema.methods.addNote = function(content, userId) {
  this.notes.push({
    content,
    createdBy: userId
  });
  return this.save();
};

module.exports = mongoose.model('Dealer', dealerSchema);