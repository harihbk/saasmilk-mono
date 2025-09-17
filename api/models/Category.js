const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Category name must contain only lowercase letters, numbers, and hyphens']
  }, 
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  icon: {
    type: String
  },
  image: {
    url: String,
    alt: String
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
categorySchema.index({ name: 1, tenantId: 1 }, { unique: true }); // Composite unique index
categorySchema.index({ displayName: 'text' });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ tenantId: 1 }); // Tenant isolation index

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });

// Virtual to get full category path
categorySchema.virtual('path').get(async function() {
  const path = [this.displayName];
  let current = this;
  
  while (current.parent) {
    current = await this.model('Category').findById(current.parent);
    if (current) {
      path.unshift(current.displayName);
    } else {
      break;
    }
  }
  
  return path.join(' > ');
});

// Static method to get active categories for tenant
categorySchema.statics.getActiveCategories = function(tenantId) {
  const query = { isActive: true };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.find(query)
    .sort('order name')
    .select('name displayName description parent icon');
};

// Method to check if category has products
categorySchema.methods.hasProducts = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ 
    category: this._id,
    tenantId: this.tenantId 
  });
  return count > 0;
};

module.exports = mongoose.model('Category', categorySchema);