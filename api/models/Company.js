const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Company slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    unique: true,
    uppercase: true
  },
  businessInfo: {
    type: {
      type: String,
      enum: ['dairy', 'food', 'beverage', 'retail', 'other'],
      default: 'dairy'
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    industry: {
      type: String,
      maxlength: [100, 'Industry cannot exceed 100 characters']
    },
    founded: {
      type: Date
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    },
    gstNumber: {
      type: String,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please provide a valid GST number'],
      uppercase: true,
      trim: true
    }
  },
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Company email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: {
        type: String,
        default: 'India'
      },
      postalCode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit postal code']
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'basic', 'professional', 'enterprise'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        // Default to 14 days trial
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        return trialEnd;
      }
    },
    maxUsers: {
      type: Number,
      default: 5
    },
    maxProducts: {
      type: Number,
      default: 100
    },
    maxOrders: {
      type: Number,
      default: 1000
    },
    features: {
      reporting: { type: Boolean, default: true },
      inventory: { type: Boolean, default: true },
      multiWarehouse: { type: Boolean, default: false },
      advancedReports: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false }
    }
  },
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      code: {
        type: String,
        default: 'INR'
      },
      symbol: {
        type: String,
        default: '₹'
      }
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#1890ff'
      },
      logo: String,
      favicon: String
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow creation without owner initially
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    maxlength: [500, 'Suspension reason cannot exceed 500 characters']
  },
  suspendedAt: {
    type: Date
  },
  stats: {
    totalUsers: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
companySchema.index({ tenantId: 1 });
companySchema.index({ slug: 1 });
companySchema.index({ 'contactInfo.email': 1 });
companySchema.index({ 'subscription.status': 1 });
companySchema.index({ isActive: 1 });

// Pre-save middleware to generate tenantId and slug
companySchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate tenantId if not provided
    if (!this.tenantId) {
      this.tenantId = await this.constructor.generateTenantId();
    }
    
    // Generate slug if not provided
    if (!this.slug) {
      this.slug = this.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      
      // Ensure uniqueness
      let counter = 1;
      let originalSlug = this.slug;
      while (await this.constructor.findOne({ slug: this.slug })) {
        this.slug = `${originalSlug}-${counter}`;
        counter++;
      }
    }
  }
  next();
});

// Static method to generate sequential tenant ID (001, 002, 003, etc.)
companySchema.statics.generateTenantId = async function() {
  try {
    // Find the highest existing numeric tenant ID
    const lastCompany = await this.findOne(
      { tenantId: { $regex: /^[0-9]{3}$/ } },
      {},
      { sort: { tenantId: -1 } }
    );
    
    let nextNumber = 1;
    
    if (lastCompany && lastCompany.tenantId) {
      const lastNumber = parseInt(lastCompany.tenantId);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // Format as 3-digit string with leading zeros (001, 002, etc.)
    const tenantId = nextNumber.toString().padStart(3, '0');
    
    // Double-check uniqueness (in case of race conditions)
    const existing = await this.findOne({ tenantId });
    if (existing) {
      // If somehow exists, find the next available number
      let counter = nextNumber + 1;
      let newTenantId;
      do {
        newTenantId = counter.toString().padStart(3, '0');
        const check = await this.findOne({ tenantId: newTenantId });
        if (!check) {
          return newTenantId;
        }
        counter++;
      } while (counter < 1000); // Safety limit
      
      // Fallback to timestamp-based ID if we somehow reach 999 companies
      return `T${Date.now().toString(36).toUpperCase()}`;
    }
    
    return tenantId;
  } catch (error) {
    console.error('Error generating tenant ID:', error);
    // Fallback to timestamp-based ID
    return `T${Date.now().toString(36).toUpperCase()}`;
  }
};

// Method to check subscription limits
companySchema.methods.checkSubscriptionLimit = function(resource, count = 1) {
  const limits = {
    users: this.subscription.maxUsers,
    products: this.subscription.maxProducts,
    orders: this.subscription.maxOrders
  };
  
  const currentUsage = {
    users: this.stats.totalUsers,
    products: this.stats.totalProducts,
    orders: this.stats.totalOrders
  };
  
  if (limits[resource] && currentUsage[resource] + count > limits[resource]) {
    return {
      allowed: false,
      message: `Subscription limit exceeded. Current: ${currentUsage[resource]}, Limit: ${limits[resource]}, Requested: ${count}`
    };
  }
  
  return { allowed: true };
};

// Method to update stats
companySchema.methods.updateStats = async function(statType, increment = 1) {
  this.stats[statType] = (this.stats[statType] || 0) + increment;
  this.stats.lastActivity = new Date();
  return this.save();
};

// Method to check feature access
companySchema.methods.hasFeature = function(featureName) {
  return this.subscription.features[featureName] === true;
};

// Method to check if subscription is active
companySchema.methods.isSubscriptionActive = function() {
  return this.subscription.status === 'active' && 
         this.subscription.endDate > new Date() &&
         this.isActive && 
         !this.isSuspended;
};

// Virtual for days remaining in subscription
companySchema.virtual('daysRemaining').get(function() {
  if (this.subscription.endDate) {
    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
  return 0;
});

// Virtual for subscription progress
companySchema.virtual('subscriptionProgress').get(function() {
  const now = new Date();
  const startDate = new Date(this.subscription.startDate);
  const endDate = new Date(this.subscription.endDate);
  
  const totalDuration = endDate - startDate;
  const elapsed = now - startDate;
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  
  return Math.round(progress);
});

// Ensure virtual fields are serialized
companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Company', companySchema);
