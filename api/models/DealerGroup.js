const mongoose = require('mongoose');

const dealerGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot be more than 100 characters']
  },
  code: {
    type: String,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Group code cannot be more than 20 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    trim: true
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%'],
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
  commissionPercentage: {
    type: Number,
    min: [0, 'Commission percentage cannot be negative'],
    max: [100, 'Commission percentage cannot exceed 100%'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#1890ff',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Please provide a valid hex color code']
  },
  icon: {
    type: String,
    default: 'TeamOutlined'
  },
  dealerCount: {
    type: Number,
    default: 0
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
  }
}, {
  timestamps: true
});

// Indexes for better query performance
dealerGroupSchema.index({ name: 1, tenantId: 1 }, { unique: true }); // Composite unique index
dealerGroupSchema.index({ code: 1, tenantId: 1 }, { unique: true }); // Composite unique index
dealerGroupSchema.index({ isActive: 1 });
dealerGroupSchema.index({ createdBy: 1 });
dealerGroupSchema.index({ tenantId: 1 }); // Tenant isolation index

// Virtual to get total dealers in group
dealerGroupSchema.virtual('totalDealers', {
  ref: 'Dealer',
  localField: '_id',
  foreignField: 'dealerGroup',
  count: true
});

// Virtual to get active dealers in group
dealerGroupSchema.virtual('activeDealers', {
  ref: 'Dealer',
  localField: '_id',
  foreignField: 'dealerGroup',
  count: true,
  match: { isActive: true }
});

// Ensure virtual fields are serialized
dealerGroupSchema.set('toJSON', { virtuals: true });
dealerGroupSchema.set('toObject', { virtuals: true });

// Pre-save middleware to generate code if not provided
dealerGroupSchema.pre('save', async function(next) {
  if (!this.code) {
    if (!this.name) {
      return next(new Error('Group name is required to generate code'));
    }
    if (!this.tenantId) {
      return next(new Error('Tenant ID is required to generate code'));
    }
    
    try {
      this.code = await this.constructor.generateUniqueCode(this.name, this.tenantId);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to generate unique code with tenant awareness
dealerGroupSchema.statics.generateUniqueCode = async function(name, tenantId) {
  try {
    if (!tenantId) {
      throw new Error('TenantId is required to generate dealer group code');
    }
    
    // Generate base code from name
    const namePrefix = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      // Generate random suffix
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const potentialCode = `${namePrefix}${randomSuffix}`;
      
      // Check if this code already exists in this tenant
      const existingGroup = await this.findOne({ 
        code: potentialCode,
        tenantId: tenantId 
      });
      
      if (!existingGroup) {
        return potentialCode;
      }
      
      attempts++;
    }
    
    // If we couldn't generate a unique code, use timestamp and tenant prefix
    const timestamp = Date.now().toString().slice(-6);
    const tenantPrefix = tenantId.slice(0, 3).padStart(3, '0');
    return `DG${tenantPrefix}${timestamp}`;
    
  } catch (error) {
    console.error('Error generating dealer group code:', error);
    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-6);
    return `DG${timestamp}`;
  }
};

// Static method to get active groups for tenant
dealerGroupSchema.statics.getActiveGroups = function(tenantId) {
  const query = { isActive: true };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.find(query)
    .sort('name')
    .select('_id name code description discountPercentage creditLimit creditDays color icon');
};

// Method to update dealer count
dealerGroupSchema.methods.updateDealerCount = async function() {
  const Dealer = mongoose.model('Dealer');
  this.dealerCount = await Dealer.countDocuments({ 
    dealerGroup: this._id,
    isActive: true,
    tenantId: this.tenantId
  });
  return this.save();
};

module.exports = mongoose.model('DealerGroup', dealerGroupSchema);