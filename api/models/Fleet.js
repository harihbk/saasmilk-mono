const mongoose = require('mongoose');

const fleetSchema = new mongoose.Schema({
  // Vehicle Information
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    uppercase: true,
    trim: true
  },
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: ['truck', 'van', 'pickup', 'bike', 'auto', 'tempo', 'container'],
    default: 'van'
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Manufacturing year is required'],
    min: [1990, 'Year must be 1990 or later'],
    max: [new Date().getFullYear() + 1, 'Invalid year']
  },
  
  // Registration & Compliance
  registrationDate: {
    
    type: Date
  },
  registrationCertificate: {
    number: String,
    documentUrl: String,
    expiryDate: Date
  },
  insurance: {
    policyNumber: String,
    provider: String,
    startDate: Date,
    expiryDate: Date,
    premium: Number,
    documentUrl: String
  },
  pollution: {
    certificateNumber: String,
    issuedDate: Date,
    expiryDate: Date,
    documentUrl: String
  },
  fitness: {
    certificateNumber: String,
    issuedDate: Date,
    expiryDate: Date,
    documentUrl: String
  },
  permit: {
    number: String,
    type: {
      type: String,
      enum: ['goods', 'passenger', 'contract', 'private', 'tourist']
    },
    issuedDate: Date,
    expiryDate: Date,
    documentUrl: String
  },
  
  // Technical Specifications
  engineNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  chassisNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid']
  },
  tankCapacity: {
    value: Number,
    unit: {
      type: String,
      enum: ['liters', 'gallons'],
      default: 'liters'
    }
  },
  mileage: {
    value: Number,
    unit: {
      type: String,
      enum: ['kmpl', 'mpg'],
      default: 'kmpl'
    }
  },
  loadCapacity: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'tons'],
      default: 'kg'
    }
  },
  
  // Current Status
  currentOdometer: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'breakdown', 'sold', 'accident'],
    default: 'active'
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  
  // Assignment
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  assignmentHistory: [{
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route'
    },
    assignedDate: Date,
    unassignedDate: Date,
    reason: String
  }],
  
  // Purchase/Ownership Details
  ownership: {
    type: String,
    enum: ['owned', 'leased', 'rented', 'contract'],
    default: 'owned'
  },
  purchaseDetails: {
    date: Date,
    vendor: String,
    amount: Number,
    invoiceNumber: String,
    documentUrl: String
  },
  leaseDetails: {
    vendor: String,
    startDate: Date,
    endDate: Date,
    monthlyAmount: Number,
    contractUrl: String
  },
  
  // Tracking
  gpsDevice: {
    deviceId: String,
    imei: String,
    simNumber: String,
    provider: String,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  lastLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    timestamp: Date
  },
  
  // Maintenance Summary
  lastServiceDate: Date,
  nextServiceDue: {
    date: Date,
    odometer: Number
  },
  totalMaintenanceCost: {
    type: Number,
    default: 0
  },
  totalFuelCost: {
    type: Number,
    default: 0
  },
  
  // Additional Information
  color: String,
  seatingCapacity: Number,
  features: [String],
  accessories: [String],
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  
  // Alerts & Reminders
  alerts: [{
    type: {
      type: String,
      enum: ['insurance', 'pollution', 'fitness', 'permit', 'service', 'custom']
    },
    message: String,
    dueDate: Date,
    reminderDays: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Multi-tenant
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    uppercase: true,
    index: true
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fleetSchema.index({ vehicleNumber: 1, tenantId: 1 }, { unique: true });
fleetSchema.index({ status: 1, tenantId: 1 });
fleetSchema.index({ assignedDriver: 1, tenantId: 1 });
fleetSchema.index({ assignedRoute: 1, tenantId: 1 });
fleetSchema.index({ 'insurance.expiryDate': 1, tenantId: 1 });
fleetSchema.index({ 'pollution.expiryDate': 1, tenantId: 1 });
fleetSchema.index({ 'fitness.expiryDate': 1, tenantId: 1 });
fleetSchema.index({ 'permit.expiryDate': 1, tenantId: 1 });
fleetSchema.index({ nextServiceDue: 1, tenantId: 1 });

// Virtual for age of vehicle
fleetSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.year;
});

// Virtual for days until next service
fleetSchema.virtual('daysUntilService').get(function() {
  if (!this.nextServiceDue?.date) return null;
  const today = new Date();
  const dueDate = new Date(this.nextServiceDue.date);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if documents are expiring soon
fleetSchema.methods.getExpiringDocuments = function(days = 30) {
  const expiringDocs = [];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const documents = [
    { name: 'Insurance', expiryDate: this.insurance?.expiryDate },
    { name: 'Pollution Certificate', expiryDate: this.pollution?.expiryDate },
    { name: 'Fitness Certificate', expiryDate: this.fitness?.expiryDate },
    { name: 'Permit', expiryDate: this.permit?.expiryDate }
  ];
  
  documents.forEach(doc => {
    if (doc.expiryDate && new Date(doc.expiryDate) <= futureDate) {
      expiringDocs.push({
        document: doc.name,
        expiryDate: doc.expiryDate,
        daysRemaining: Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      });
    }
  });
  
  return expiringDocs;
};

// Method to update odometer reading
fleetSchema.methods.updateOdometer = async function(newReading) {
  if (newReading < this.currentOdometer) {
    throw new Error('New odometer reading cannot be less than current reading');
  }
  this.currentOdometer = newReading;
  
  // Check if service is due based on odometer
  if (this.nextServiceDue?.odometer && newReading >= this.nextServiceDue.odometer) {
    // Trigger service due alert
    this.alerts.push({
      type: 'service',
      message: `Service due - Odometer reached ${this.nextServiceDue.odometer}`,
      dueDate: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Method to calculate total cost of ownership
fleetSchema.methods.calculateTotalCost = function() {
  let totalCost = 0;
  
  // Add purchase cost
  if (this.ownership === 'owned' && this.purchaseDetails?.amount) {
    totalCost += this.purchaseDetails.amount;
  }
  
  // Add lease costs
  if (this.ownership === 'leased' && this.leaseDetails?.monthlyAmount) {
    const months = this.leaseDetails.endDate 
      ? Math.ceil((new Date(this.leaseDetails.endDate) - new Date(this.leaseDetails.startDate)) / (1000 * 60 * 60 * 24 * 30))
      : 0;
    totalCost += this.leaseDetails.monthlyAmount * months;
  }
  
  // Add maintenance and fuel costs
  totalCost += this.totalMaintenanceCost + this.totalFuelCost;
  
  // Add insurance premiums
  if (this.insurance?.premium) {
    totalCost += this.insurance.premium;
  }
  
  return totalCost;
};

// Pre-save middleware to generate alerts for expiring documents
fleetSchema.pre('save', function(next) {
  if (this.isModified('insurance.expiryDate') || this.isModified('pollution.expiryDate') || 
      this.isModified('fitness.expiryDate') || this.isModified('permit.expiryDate')) {
    
    // Remove old alerts
    this.alerts = this.alerts.filter(alert => 
      !['insurance', 'pollution', 'fitness', 'permit'].includes(alert.type)
    );
    
    // Add new alerts for expiring documents
    const alertDocs = [
      { type: 'insurance', date: this.insurance?.expiryDate, name: 'Insurance' },
      { type: 'pollution', date: this.pollution?.expiryDate, name: 'Pollution Certificate' },
      { type: 'fitness', date: this.fitness?.expiryDate, name: 'Fitness Certificate' },
      { type: 'permit', date: this.permit?.expiryDate, name: 'Permit' }
    ];
    
    alertDocs.forEach(doc => {
      if (doc.date) {
        this.alerts.push({
          type: doc.type,
          message: `${doc.name} expiring soon`,
          dueDate: doc.date,
          reminderDays: 30,
          isActive: true
        });
      }
    });
  }
  
  next();
});

module.exports = mongoose.model('Fleet', fleetSchema);