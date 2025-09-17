const mongoose = require('mongoose');

const dealerGroupPricingSchema = new mongoose.Schema({
  dealerGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DealerGroup',
    required: [true, 'Dealer group is required']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      min: [0, 'Discount value cannot be negative'],
      default: 0
    },
    finalPrice: {
      type: Number,
      min: [0, 'Final price cannot be negative']
    }
  },
  tax: {
    igst: {
      type: Number,
      min: [0, 'IGST cannot be negative'],
      max: [100, 'IGST cannot exceed 100%'],
      default: 0
    },
    cgst: {
      type: Number,
      min: [0, 'CGST cannot be negative'],
      max: [100, 'CGST cannot exceed 100%'],
      default: 0
    },
    sgst: {
      type: Number,
      min: [0, 'SGST cannot be negative'],
      max: [100, 'SGST cannot exceed 100%'],
      default: 0
    },
    totalTax: {
      type: Number,
      default: 0
    },
    priceWithTax: {
      type: Number,
      default: 0
    }
  },
  margin: {
    type: Number,
    default: 0
  },
  marginPercentage: {
    type: Number,
    default: 0
  },
  minOrderQuantity: {
    type: Number,
    min: [1, 'Minimum order quantity must be at least 1'],
    default: 1
  },
  maxOrderQuantity: {
    type: Number,
    min: [1, 'Maximum order quantity must be at least 1']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Compound index to ensure one pricing record per product per dealer group per tenant
dealerGroupPricingSchema.index({ dealerGroup: 1, product: 1, tenantId: 1 }, { unique: true });

// Other indexes for better query performance
dealerGroupPricingSchema.index({ dealerGroup: 1, isActive: 1 });
dealerGroupPricingSchema.index({ product: 1, isActive: 1 });
dealerGroupPricingSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
dealerGroupPricingSchema.index({ createdBy: 1 });
dealerGroupPricingSchema.index({ tenantId: 1 }); // Tenant isolation index

// Pre-save middleware to calculate derived values
dealerGroupPricingSchema.pre('save', function(next) {
  // Calculate final price after discount
  if (this.pricing.discountType === 'percentage') {
    const discountAmount = (this.pricing.sellingPrice * this.pricing.discountValue) / 100;
    this.pricing.finalPrice = this.pricing.sellingPrice - discountAmount;
  } else {
    this.pricing.finalPrice = this.pricing.sellingPrice - this.pricing.discountValue;
  }

  // Ensure final price is not negative
  if (this.pricing.finalPrice < 0) {
    this.pricing.finalPrice = 0;
  }

  // Calculate total tax
  this.tax.totalTax = this.tax.igst > 0 ? this.tax.igst : (this.tax.cgst + this.tax.sgst);
  
  // Calculate price with tax
  this.tax.priceWithTax = this.pricing.finalPrice * (1 + this.tax.totalTax / 100);

  // Calculate margin and margin percentage
  this.margin = this.pricing.finalPrice - this.pricing.basePrice;
  if (this.pricing.basePrice > 0) {
    this.marginPercentage = (this.margin / this.pricing.basePrice) * 100;
  } else {
    this.marginPercentage = 0;
  }

  next();
});

// Virtual for effective status
dealerGroupPricingSchema.virtual('isEffective').get(function() {
  const now = new Date();
  const effectiveFrom = this.effectiveFrom || new Date(0);
  const effectiveTo = this.effectiveTo || new Date('2099-12-31');
  
  return this.isActive && now >= effectiveFrom && now <= effectiveTo;
});

// Ensure virtual fields are serialized
dealerGroupPricingSchema.set('toJSON', { virtuals: true });
dealerGroupPricingSchema.set('toObject', { virtuals: true });

// Static method to get pricing for a dealer group
dealerGroupPricingSchema.statics.getPricingForGroup = function(dealerGroupId, options = {}) {
  const query = { 
    dealerGroup: dealerGroupId,
    isActive: true
  };

  // Add date range filter if specified
  if (options.effectiveDate) {
    const date = new Date(options.effectiveDate);
    query.effectiveFrom = { $lte: date };
    query.$or = [
      { effectiveTo: { $gte: date } },
      { effectiveTo: { $exists: false } }
    ];
  }

  return this.find(query)
    .populate('product', 'name sku brand category packaging.size packaging.type')
    .populate('dealerGroup', 'name code color')
    .sort(options.sort || { 'product.name': 1 });
};

// Static method to get pricing for a specific product across groups
dealerGroupPricingSchema.statics.getPricingForProduct = function(productId, options = {}) {
  const query = { 
    product: productId,
    isActive: true
  };

  return this.find(query)
    .populate('dealerGroup', 'name code color discountPercentage')
    .populate('product', 'name sku brand')
    .sort(options.sort || { 'pricing.finalPrice': 1 });
};

// Method to check if pricing is currently effective
dealerGroupPricingSchema.methods.isCurrentlyEffective = function() {
  const now = new Date();
  const effectiveFrom = this.effectiveFrom || new Date(0);
  const effectiveTo = this.effectiveTo || new Date('2099-12-31');
  
  return this.isActive && now >= effectiveFrom && now <= effectiveTo;
};

// Method to calculate price for quantity
dealerGroupPricingSchema.methods.calculatePrice = function(quantity = 1) {
  const baseAmount = this.pricing.finalPrice * quantity;
  const taxAmount = (baseAmount * this.tax.totalTax) / 100;
  
  return {
    quantity,
    unitPrice: this.pricing.finalPrice,
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
    tax: {
      igst: this.tax.igst,
      cgst: this.tax.cgst,
      sgst: this.tax.sgst,
      totalTax: this.tax.totalTax
    }
  };
};

module.exports = mongoose.model('DealerGroupPricing', dealerGroupPricingSchema);