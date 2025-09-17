const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierNumber: {
    type: String
    // Generated automatically in pre-save middleware
  },
  companyInfo: {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    legalName: String,
    businessType: {
      type: String,
      enum: ['dairy-farm', 'processing-plant', 'distributor', 'manufacturer', 'cooperative', 'other'],
      required: true
    },
    establishedYear: Number,
    website: String,
    description: String
  },
  contactInfo: {
    primaryContact: {
      name: {
        type: String,
        required: [true, 'Primary contact name is required']
      },
      title: String,
      email: {
        type: String,
        required: [true, 'Primary contact email is required'],
        lowercase: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          'Please enter a valid email'
        ]
      },
      phone: {
        type: String,
        required: [true, 'Primary contact phone is required'],
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
      }
    },
    alternateContacts: [{
      name: String,
      title: String,
      email: String,
      phone: String,
      department: String
    }],
    emergencyContact: {
      name: String,
      phone: String,
      availableHours: String
    }
  },
  addresses: {
    headquarters: {
      street: {
        type: String,
        required: [true, 'Headquarters street address is required']
      },
      city: {
        type: String,
        required: [true, 'Headquarters city is required']
      },
      state: {
        type: String,
        required: [true, 'Headquarters state is required']
      },
      zipCode: {
        type: String,
        required: [true, 'Headquarters zip code is required']
      },
      country: {
        type: String,
        required: [true, 'Headquarters country is required'],
        default: 'India'
      }
    },
    billing: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      sameAsHeadquarters: {
        type: Boolean,
        default: true
      }
    },
    facilities: [{
      name: String,
      type: {
        type: String,
        enum: ['farm', 'processing', 'warehouse', 'distribution', 'office']
      },
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      capacity: String,
      certifications: [String]
    }]
  },
  businessDetails: {
    taxId: {
      type: String,
      required: [true, 'Tax ID is required']
    },
    gstNumber: String,
    panNumber: String,
    licenseNumbers: [String],
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branchName: String,
      ifscCode: String,
      swiftCode: String
    }
  },
  products: [{
    category: {
      type: String,
      enum: [
        'raw-milk',
        'processed-milk',
        'dairy-products',
        'packaging-materials',
        'equipment',
        'chemicals',
        'feed',
        'other'
      ]
    },
    name: String,
    description: String,
    specifications: String,
    minimumOrderQuantity: Number,
    leadTime: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks']
      }
    },
    priceRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'INR'
      }
    }
  }],
  qualityStandards: {
    certifications: [{
      name: String,
      issuedBy: String,
      validFrom: Date,
      validUntil: Date,
      certificateNumber: String,
      status: {
        type: String,
        enum: ['active', 'expired', 'suspended'],
        default: 'active'
      }
    }],
    qualityGrade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C'],
      default: 'B'
    },
    lastAuditDate: Date,
    nextAuditDate: Date,
    auditScore: {
      type: Number,
      min: 0,
      max: 100
    },
    complianceNotes: String
  },
  financialInfo: {
    creditRating: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'not-rated'],
      default: 'not-rated'
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative']
    },
    paymentTerms: {
      type: String,
      enum: ['advance', 'cod', 'net-7', 'net-15', 'net-30', 'net-60'],
      default: 'net-30'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    totalPurchases: {
      type: Number,
      default: 0
    },
    outstandingAmount: {
      type: Number,
      default: 0
    }
  },
  performance: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    onTimeDelivery: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    responseTime: {
      type: Number, // in hours
      default: 24
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    },
    cancelledOrders: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    firstOrderDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blacklisted', 'pending-approval'],
    default: 'pending-approval'
  },
  contractInfo: {
    contractType: {
      type: String,
      enum: ['one-time', 'short-term', 'long-term', 'exclusive', 'preferred']
    },
    startDate: Date,
    endDate: Date,
    renewalDate: Date,
    terms: String,
    specialConditions: String
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['general', 'quality', 'delivery', 'payment', 'contract']
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  tags: [String],
  assignedBuyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  lastContactDate: Date,
  nextReviewDate: Date
}, {
  timestamps: true
});

// Indexes for better query performance
supplierSchema.index({ supplierNumber: 1, tenantId: 1 }, { unique: true }); // Composite unique index
supplierSchema.index({ 'companyInfo.name': 'text' });
supplierSchema.index({ 'contactInfo.primaryContact.email': 1 });
supplierSchema.index({ 'businessDetails.taxId': 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ assignedBuyer: 1 });
supplierSchema.index({ 'qualityStandards.qualityGrade': 1 });
supplierSchema.index({ tenantId: 1 }); // Tenant isolation index

// Pre-save middleware to generate supplier number
supplierSchema.pre('save', async function(next) {
  if (this.isNew && !this.supplierNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Find the last supplier of the month for this tenant
    const lastSupplier = await this.constructor.findOne({
      supplierNumber: new RegExp(`^SUPP${year}${month}`),
      tenantId: this.tenantId
    }).sort({ supplierNumber: -1 });
    
    let sequence = 1;
    if (lastSupplier) {
      const lastSequence = parseInt(lastSupplier.supplierNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    this.supplierNumber = `SUPP${year}${month}${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Pre-save middleware to sync billing address if same as headquarters
supplierSchema.pre('save', function(next) {
  if (this.addresses.billing.sameAsHeadquarters) {
    this.addresses.billing.street = this.addresses.headquarters.street;
    this.addresses.billing.city = this.addresses.headquarters.city;
    this.addresses.billing.state = this.addresses.headquarters.state;
    this.addresses.billing.zipCode = this.addresses.headquarters.zipCode;
    this.addresses.billing.country = this.addresses.headquarters.country;
  }
  next();
});

// Virtual for supplier age in days
supplierSchema.virtual('supplierAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for completion rate
supplierSchema.virtual('completionRate').get(function() {
  if (this.performance.totalOrders === 0) return 0;
  return ((this.performance.completedOrders / this.performance.totalOrders) * 100).toFixed(2);
});

// Virtual for overall performance score
supplierSchema.virtual('performanceScore').get(function() {
  const weights = {
    onTimeDelivery: 0.3,
    qualityScore: 0.4,
    completionRate: 0.3
  };
  
  const completionRate = this.completionRate;
  const score = (
    this.performance.onTimeDelivery * weights.onTimeDelivery +
    this.performance.qualityScore * weights.qualityScore +
    completionRate * weights.completionRate
  );
  
  return Math.round(score);
});

// Ensure virtual fields are serialized
supplierSchema.set('toJSON', { virtuals: true });

// Method to update performance metrics
supplierSchema.methods.updatePerformance = function(orderData) {
  this.performance.totalOrders += 1;
  
  if (orderData.status === 'completed') {
    this.performance.completedOrders += 1;
    
    if (orderData.deliveredOnTime) {
      const currentRate = this.performance.onTimeDelivery;
      const totalCompleted = this.performance.completedOrders;
      this.performance.onTimeDelivery = ((currentRate * (totalCompleted - 1)) + 100) / totalCompleted;
    }
  } else if (orderData.status === 'cancelled') {
    this.performance.cancelledOrders += 1;
  }
  
  this.performance.lastOrderDate = new Date();
  
  if (!this.performance.firstOrderDate) {
    this.performance.firstOrderDate = new Date();
  }
  
  return this.save();
};

// Method to add note
supplierSchema.methods.addNote = function(content, category, createdBy, isPrivate = false) {
  this.notes.push({
    content,
    category,
    createdBy,
    isPrivate
  });
  
  return this.save();
};

module.exports = mongoose.model('Supplier', supplierSchema);
