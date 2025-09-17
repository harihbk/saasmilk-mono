const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Route code cannot exceed 10 characters'],
    match: [/^[A-Z0-9]+$/, 'Route code can only contain uppercase letters and numbers']
  },
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxlength: [100, 'Route name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Route description cannot exceed 500 characters']
  },
  area: {
    type: String,
    trim: true,
    maxlength: [100, 'Area name cannot exceed 100 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [50, 'State name cannot exceed 50 characters']
  },
  pincode: {
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  dealerCount: {
    type: Number,
    default: 0,
    min: [0, 'Dealer count cannot be negative']
  },
  estimatedDeliveryTime: {
    type: Number, // in hours
    default: 24,
    min: [1, 'Delivery time must be at least 1 hour']
  },
  deliveryDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
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

// Indexes for better query performance
routeSchema.index({ code: 1, tenantId: 1 }, { unique: true }); // Composite unique index
routeSchema.index({ name: 1 });
routeSchema.index({ status: 1 });
routeSchema.index({ assignedTo: 1 });
routeSchema.index({ city: 1 });
routeSchema.index({ state: 1 });
routeSchema.index({ createdAt: -1 });
routeSchema.index({ tenantId: 1 }); // Tenant isolation index

// Virtual for route display name
routeSchema.virtual('displayName').get(function() {
  return `${this.code} - ${this.name}`;
});

// Virtual to check if route is operational today
routeSchema.virtual('isOperationalToday').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return this.deliveryDays.includes(today);
});

// Method to update dealer count
routeSchema.methods.updateDealerCount = async function() {
  const Dealer = mongoose.model('Dealer');
  const count = await Dealer.countDocuments({ 
    route: this._id, 
    status: 'active',
    tenantId: this.tenantId
  });
  this.dealerCount = count;
  await this.save();
  return count;
};

// Pre-save middleware to auto-generate route code if not provided
routeSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    // Generate route code based on city and incremental number
    const cityPrefix = this.city ? this.city.substring(0, 3).toUpperCase() : 'RTE';
    
    // Find the last route with similar prefix for this tenant
    const lastRoute = await this.constructor.findOne({
      code: new RegExp(`^${cityPrefix}`),
      tenantId: this.tenantId
    }).sort({ code: -1 });
    
    let sequence = 1;
    if (lastRoute) {
      const lastSequence = parseInt(lastRoute.code.slice(-3));
      sequence = lastSequence + 1;
    }
    
    this.code = `${cityPrefix}${sequence.toString().padStart(3, '0')}`;
  }
  next();
});

// Pre-save middleware to update timestamps
routeSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    this.updatedBy = this.updatedBy || this.createdBy;
  }
  next();
});

// Ensure virtual fields are serialized
routeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Route', routeSchema);