const mongoose = require('mongoose');

const fleetMaintenanceSchema = new mongoose.Schema({
  // Vehicle Reference
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fleet',
    required: [true, 'Vehicle reference is required']
  },
  
  // Maintenance Details
  maintenanceType: {
    type: String,
    enum: [
      'routine_service', 'oil_change', 'tire_change', 'brake_service', 'engine_repair',
      'transmission_repair', 'electrical_repair', 'body_repair', 'painting',
      'ac_service', 'battery_replacement', 'filter_change', 'coolant_service',
      'alignment', 'balancing', 'suspension_repair', 'clutch_repair',
      'fuel_system', 'exhaust_repair', 'inspection', 'emergency_repair', 'other'
    ],
    required: [true, 'Maintenance type is required']
  },
  
  serviceCategory: {
    type: String,
    enum: ['preventive', 'corrective', 'predictive', 'emergency'],
    required: [true, 'Service category is required']
  },
  
  title: {
    type: String,
    required: [true, 'Maintenance title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Maintenance description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Service Provider
  serviceProvider: {
    name: {
      type: String,
      required: [true, 'Service provider name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['authorized_dealer', 'local_garage', 'company_workshop', 'roadside_assistance'],
      required: [true, 'Service provider type is required']
    },
    contactPerson: String,
    phone: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    },
    gst: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Timing & Status
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  startDate: Date,
  completionDate: Date,
  
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'scheduled'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Vehicle Condition
  preServiceCondition: {
    odometer: {
      type: Number,
      required: [true, 'Pre-service odometer reading is required'],
      min: 0
    },
    fuelLevel: {
      type: Number,
      min: 0,
      max: 100
    },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    issues: [String],
    photos: [{
      url: String,
      caption: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  postServiceCondition: {
    odometer: Number,
    fuelLevel: Number,
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    resolvedIssues: [String],
    newIssues: [String],
    photos: [{
      url: String,
      caption: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Work Details
  workPerformed: [{
    item: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      default: 1
    },
    unit: {
      type: String,
      default: 'piece'
    },
    unitCost: Number,
    totalCost: Number,
    partNumber: String,
    warranty: {
      period: Number,
      unit: {
        type: String,
        enum: ['days', 'months', 'years', 'kilometers'],
        default: 'months'
      }
    }
  }],
  
  partsReplaced: [{
    name: {
      type: String,
      required: true
    },
    partNumber: String,
    brand: String,
    type: {
      type: String,
      enum: ['original', 'genuine', 'aftermarket', 'refurbished']
    },
    quantity: {
      type: Number,
      default: 1
    },
    unitCost: Number,
    totalCost: Number,
    supplier: String,
    warranty: {
      period: Number,
      unit: {
        type: String,
        enum: ['days', 'months', 'years', 'kilometers'],
        default: 'months'
      }
    },
    oldPartCondition: String,
    oldPartDisposal: String
  }],
  
  // Cost Details
  costBreakdown: {
    laborCost: {
      type: Number,
      default: 0
    },
    partsCost: {
      type: Number,
      default: 0
    },
    materialsCost: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    additionalCharges: {
      type: Number,
      default: 0
    }
  },
  
  totalCost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: 0
  },
  
  paymentDetails: {
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit'],
      required: [true, 'Payment method is required']
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending'
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    dueAmount: {
      type: Number,
      default: 0
    },
    paymentDate: Date,
    referenceNumber: String,
    terms: String
  },
  
  // Documents & Receipts
  receipts: [{
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'estimate', 'warranty_card', 'inspection_report'],
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: String,
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    receiptNumber: String,
    receiptDate: Date,
    vendor: String,
    description: String,
    tags: [String]
  }],
  
  // Quality & Inspection
  qualityCheck: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    checklist: [{
      item: String,
      status: {
        type: String,
        enum: ['pass', 'fail', 'na']
      },
      notes: String
    }],
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    inspectionDate: Date,
    overallStatus: {
      type: String,
      enum: ['approved', 'rejected', 'conditional']
    },
    remarks: String
  },
  
  // Next Service Recommendation
  nextService: {
    type: {
      type: String,
      enum: ['routine_service', 'oil_change', 'tire_change', 'brake_service', 'inspection']
    },
    recommendedDate: Date,
    recommendedOdometer: Number,
    description: String,
    estimatedCost: Number
  },
  
  // Warranty Information
  warranty: {
    isUnderWarranty: {
      type: Boolean,
      default: false
    },
    warrantyProvider: String,
    warrantyNumber: String,
    coverageDetails: String,
    validUntil: Date,
    claimNumber: String
  },
  
  // Additional Information
  downtime: {
    start: Date,
    end: Date,
    totalHours: Number,
    impact: String
  },
  
  feedback: {
    customerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    recommendation: {
      type: Boolean,
      default: true
    }
  },
  
  notes: String,
  internalNotes: String,
  
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  followUpNotes: String,
  
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
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fleetMaintenanceSchema.index({ vehicle: 1, tenantId: 1 });
fleetMaintenanceSchema.index({ status: 1, tenantId: 1 });
fleetMaintenanceSchema.index({ maintenanceType: 1, tenantId: 1 });
fleetMaintenanceSchema.index({ scheduledDate: 1, tenantId: 1 });
fleetMaintenanceSchema.index({ createdAt: -1, tenantId: 1 });
fleetMaintenanceSchema.index({ 'serviceProvider.name': 1, tenantId: 1 });
fleetMaintenanceSchema.index({ priority: 1, status: 1, tenantId: 1 });

// Virtual for maintenance duration
fleetMaintenanceSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.completionDate) return null;
  return Math.ceil((this.completionDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
fleetMaintenanceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return false;
  return new Date() > this.scheduledDate;
});

// Virtual for total receipt amount
fleetMaintenanceSchema.virtual('totalReceiptAmount').get(function() {
  return this.receipts.reduce((total, receipt) => total + (receipt.amount || 0), 0);
});

// Method to calculate total cost from breakdown
fleetMaintenanceSchema.methods.calculateTotalCost = function() {
  const breakdown = this.costBreakdown;
  return (breakdown.laborCost || 0) + 
         (breakdown.partsCost || 0) + 
         (breakdown.materialsCost || 0) + 
         (breakdown.taxAmount || 0) + 
         (breakdown.additionalCharges || 0) - 
         (breakdown.discountAmount || 0);
};

// Method to update payment status
fleetMaintenanceSchema.methods.updatePaymentStatus = function() {
  const payment = this.paymentDetails;
  if (payment.paidAmount >= this.totalCost) {
    payment.status = 'paid';
    payment.dueAmount = 0;
  } else if (payment.paidAmount > 0) {
    payment.status = 'partial';
    payment.dueAmount = this.totalCost - payment.paidAmount;
  } else {
    payment.status = 'pending';
    payment.dueAmount = this.totalCost;
  }
  
  // Check if overdue
  if (payment.status !== 'paid' && this.completionDate) {
    const daysSinceCompletion = Math.ceil((new Date() - this.completionDate) / (1000 * 60 * 60 * 24));
    if (daysSinceCompletion > 30) {
      payment.status = 'overdue';
    }
  }
};

// Method to add receipt
fleetMaintenanceSchema.methods.addReceipt = function(receiptData) {
  this.receipts.push(receiptData);
  
  // Update parts cost if it's a parts receipt
  if (receiptData.type === 'invoice' || receiptData.type === 'receipt') {
    if (receiptData.amount) {
      this.costBreakdown.partsCost = (this.costBreakdown.partsCost || 0) + receiptData.amount;
      this.totalCost = this.calculateTotalCost();
    }
  }
  
  this.updatePaymentStatus();
  return this.save();
};

// Method to complete maintenance
fleetMaintenanceSchema.methods.completeMaintenance = async function(completionData = {}) {
  this.status = 'completed';
  this.completionDate = completionData.completionDate || new Date();
  this.completedBy = completionData.completedBy;
  
  if (completionData.postServiceCondition) {
    this.postServiceCondition = { ...this.postServiceCondition, ...completionData.postServiceCondition };
  }
  
  // Update vehicle's last service date and next service due
  const Fleet = mongoose.model('Fleet');
  const vehicle = await Fleet.findById(this.vehicle);
  if (vehicle) {
    vehicle.lastServiceDate = this.completionDate;
    vehicle.totalMaintenanceCost = (vehicle.totalMaintenanceCost || 0) + this.totalCost;
    
    // Update odometer if provided
    if (this.postServiceCondition?.odometer) {
      vehicle.currentOdometer = this.postServiceCondition.odometer;
    }
    
    // Set next service due based on maintenance type
    if (this.maintenanceType === 'routine_service') {
      const nextServiceDate = new Date(this.completionDate);
      nextServiceDate.setMonth(nextServiceDate.getMonth() + 6); // 6 months later
      
      vehicle.nextServiceDue = {
        date: nextServiceDate,
        odometer: (vehicle.currentOdometer || 0) + 10000 // 10,000 km later
      };
    }
    
    await vehicle.save();
  }
  
  this.updatePaymentStatus();
  return this.save();
};

// Pre-save middleware to auto-calculate costs
fleetMaintenanceSchema.pre('save', function(next) {
  // Calculate total from breakdown if breakdown is provided
  if (this.isModified('costBreakdown')) {
    this.totalCost = this.calculateTotalCost();
  }
  
  // Update payment status
  if (this.isModified('paymentDetails.paidAmount') || this.isModified('totalCost')) {
    this.updatePaymentStatus();
  }
  
  // Calculate work performed costs
  if (this.isModified('workPerformed')) {
    this.workPerformed.forEach(work => {
      if (work.quantity && work.unitCost) {
        work.totalCost = work.quantity * work.unitCost;
      }
    });
    
    const totalWorkCost = this.workPerformed.reduce((total, work) => total + (work.totalCost || 0), 0);
    this.costBreakdown.laborCost = totalWorkCost;
  }
  
  // Calculate parts costs
  if (this.isModified('partsReplaced')) {
    this.partsReplaced.forEach(part => {
      if (part.quantity && part.unitCost) {
        part.totalCost = part.quantity * part.unitCost;
      }
    });
    
    const totalPartsCost = this.partsReplaced.reduce((total, part) => total + (part.totalCost || 0), 0);
    this.costBreakdown.partsCost = totalPartsCost;
  }
  
  next();
});

// Post-save middleware to update vehicle's maintenance summary
fleetMaintenanceSchema.post('save', async function() {
  if (this.status === 'completed') {
    try {
      const Fleet = mongoose.model('Fleet');
      const vehicle = await Fleet.findById(this.vehicle);
      if (vehicle) {
        // Update total maintenance cost
        const totalMaintenance = await this.constructor.aggregate([
          { 
            $match: { 
              vehicle: this.vehicle, 
              status: 'completed',
              tenantId: this.tenantId
            } 
          },
          { 
            $group: { 
              _id: null, 
              total: { $sum: '$totalCost' } 
            } 
          }
        ]);
        
        if (totalMaintenance.length > 0) {
          vehicle.totalMaintenanceCost = totalMaintenance[0].total;
          await vehicle.save();
        }
      }
    } catch (error) {
      console.error('Error updating vehicle maintenance summary:', error);
    }
  }
});

module.exports = mongoose.model('FleetMaintenance', fleetMaintenanceSchema);