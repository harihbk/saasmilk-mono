const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    uppercase: true
  },
  barcode: {
    type: String,
    sparse: true
  },
  price: {
    cost: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative']
    },
    selling: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    wholesale: {
      type: Number,
      min: [0, 'Wholesale price cannot be negative']
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
    }
  },
  packaging: {
    type: {
      type: String,
      required: [true, 'Packaging type is required'],
      enum: ['bottle', 'carton', 'pouch', 'can', 'jar', 'bag', 'bulk']
    },
    size: {
      value: {
        type: Number,
        required: [true, 'Package size is required'],
        min: [0, 'Package size must be positive']
      },
      unit: {
        type: String,
        required: [true, 'Package unit is required'],
        enum: ['ml', 'l', 'g', 'kg', 'oz', 'lb']
      }
    },
    material: String
  },
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    fat: Number,
    carbohydrates: Number,
    calcium: Number,
    vitamins: [String],
    allergens: [String]
  },
  storage: {
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    humidity: {
      min: Number,
      max: Number
    },
    shelfLife: {
      value: Number,
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months', 'years']
      }
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  tags: [String],
  minStockLevel: {
    type: Number,
    default: 10,
    min: [0, 'Minimum stock level cannot be negative']
  },
  maxStockLevel: {
    type: Number,
    min: [0, 'Maximum stock level cannot be negative']
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  certifications: [String],
  expiryDate: {
    type: Date
  },
  unit: {
    type: String,
    default: 'piece'
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
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ sku: 1, tenantId: 1 }, { unique: true }); // Composite unique index
productSchema.index({ status: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ createdBy: 1 });
productSchema.index({ tenantId: 1 }); // Tenant isolation index

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.price.selling && this.price.cost) {
    return ((this.price.selling - this.price.cost) / this.price.cost * 100).toFixed(2);
  }
  return 0;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { 
  virtuals: true,
  transform: function(_doc, ret) {
    // Ensure category is populated properly
    if (ret.category && typeof ret.category === 'object' && ret.category._id) {
      ret.categoryDetails = ret.category;
      ret.category = ret.category._id;
    }
    return ret;
  }
});

// Pre-save middleware to ensure only one primary image
productSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    let primaryCount = 0;
    this.images.forEach(image => {
      if (image.isPrimary) primaryCount++;
    });
    
    if (primaryCount === 0) {
      this.images[0].isPrimary = true;
    } else if (primaryCount > 1) {
      let firstPrimary = true;
      this.images.forEach(image => {
        if (image.isPrimary && firstPrimary) {
          firstPrimary = false;
        } else if (image.isPrimary) {
          image.isPrimary = false;
        }
      });
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
