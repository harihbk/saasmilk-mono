const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [100, 'Warehouse name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Warehouse code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Warehouse code cannot exceed 20 characters'],
    match: [/^[A-Z0-9_-]+$/, 'Warehouse code can only contain uppercase letters, numbers, underscores, and dashes']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'India'
    }
  },
  contact: {
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    manager: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Manager name cannot exceed 100 characters']
      },
      phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Manager phone cannot exceed 20 characters']
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [100, 'Manager email cannot exceed 100 characters']
      }
    }
  },
  capacity: {
    maxItems: {
      type: Number,
      min: [0, 'Maximum items cannot be negative'],
      default: 0
    },
    maxWeight: {
      type: Number,
      min: [0, 'Maximum weight cannot be negative'],
      default: 0
    },
    unit: {
      type: String,
      enum: ['kg', 'tons', 'lbs'],
      default: 'kg'
    }
  },
  zones: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    description: String,
    aisles: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
      },
      shelves: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        code: {
          type: String,
          required: true,
          trim: true,
          uppercase: true
        },
        bins: [String]
      }]
    }]
  }],
  settings: {
    temperatureControlled: {
      type: Boolean,
      default: false
    },
    temperatureRange: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    operatingHours: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    },
    autoReorderEnabled: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
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

// Indexes
warehouseSchema.index({ name: 1, tenantId: 1 }, { unique: true }); // Composite unique index
warehouseSchema.index({ code: 1, tenantId: 1 }, { unique: true }); // Composite unique index
warehouseSchema.index({ status: 1 });
warehouseSchema.index({ 'address.city': 1 });
warehouseSchema.index({ 'address.state': 1 });
warehouseSchema.index({ tenantId: 1 }); // Tenant isolation index

// Virtual for full address
warehouseSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
    .filter(Boolean)
    .join(', ');
});

// Virtual for total zones/aisles/shelves
warehouseSchema.virtual('totalZones').get(function() {
  return this.zones ? this.zones.length : 0;
});

warehouseSchema.virtual('totalAisles').get(function() {
  if (!this.zones) return 0;
  return this.zones.reduce((total, zone) => 
    total + (zone.aisles ? zone.aisles.length : 0), 0);
});

warehouseSchema.virtual('totalShelves').get(function() {
  if (!this.zones) return 0;
  return this.zones.reduce((total, zone) => {
    if (!zone.aisles) return total;
    return total + zone.aisles.reduce((aisleTotal, aisle) => 
      aisleTotal + (aisle.shelves ? aisle.shelves.length : 0), 0);
  }, 0);
});

// Ensure virtual fields are serialized
warehouseSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to update lastUpdatedBy
warehouseSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdatedBy = this.createdBy; // Will be overridden in route
  }
  next();
});

// Static method to get active warehouses for tenant
warehouseSchema.statics.getActiveWarehouses = function(tenantId) {
  const query = { status: 'active' };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.find(query)
    .select('name code description address.city address.state')
    .sort({ name: 1 });
};

// Instance method to get warehouse summary
warehouseSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    code: this.code,
    fullAddress: this.fullAddress,
    status: this.status,
    totalZones: this.totalZones,
    totalAisles: this.totalAisles,
    totalShelves: this.totalShelves,
    contact: this.contact
  };
};

module.exports = mongoose.model('Warehouse', warehouseSchema);