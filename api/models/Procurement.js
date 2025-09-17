const mongoose = require('mongoose');

const procurementItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number
    // Calculated automatically in pre-save middleware
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative']
  },
  qualityGrade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C', 'Rejected'],
    default: 'A'
  },
  expiryDate: Date,
  batchNumber: String,
  notes: String
});

const procurementSchema = new mongoose.Schema({
  procurementNumber: {
    type: String
    // Generated automatically in pre-save middleware (Tally-style numbering)
  },
  voucherNumber: {
    type: String
    // Tally-style voucher number format
  },
  referenceNumber: {
    type: String,
    // External reference like PO number, invoice number
  },
  series: {
    type: String,
    default: 'PO',
    enum: ['PO', 'WO', 'SO', 'JO'] // Purchase Order, Work Order, Service Order, Job Order
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  procurementType: {
    type: String,
    enum: ['purchase-order', 'contract', 'spot-buy', 'emergency', 'bulk'],
    default: 'purchase-order'
  },
  status: {
    type: String,
    enum: [
      'draft',
      'pending-approval',
      'approved',
      'sent-to-supplier',
      'acknowledged',
      'in-production',
      'ready-to-ship',
      'shipped',
      'partially-received',
      'received',
      'quality-check',
      'completed',
      'cancelled',
      'rejected'
    ],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent', 'critical'],
    default: 'normal'
  },
  items: [procurementItemSchema],
  // Tally-style accounting breakdown
  accounting: {
    // Basic amounts
    grossAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    taxableAmount: {
      type: Number,
      default: 0
    },
    
    // Tax breakdown (Indian GST style like Tally)
    taxes: {
      cgst: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
      },
      sgst: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
      },
      igst: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
      },
      cess: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
      }
    },
    
    totalTaxAmount: {
      type: Number,
      default: 0
    },
    
    // Additional charges
    additionalCharges: [{
      name: String,
      amount: Number,
      percentage: Number,
      taxable: { type: Boolean, default: false }
    }],
    
    roundOff: {
      type: Number,
      default: 0
    },
    
    netAmount: {
      type: Number,
      default: 0
    },
    
    currency: {
      type: String,
      default: 'INR'
    },
    
    exchangeRate: {
      type: Number,
      default: 1
    }
  },
  
  // Legacy pricing for backward compatibility
  pricing: {
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    shipping: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative']
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  delivery: {
    expectedDate: Date,
    actualDate: Date,
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    instructions: String,
    carrier: String,
    trackingNumber: String
  },
  payment: {
    terms: {
      type: String,
      enum: ['advance', 'cod', 'net-7', 'net-15', 'net-30', 'net-60', 'net-90'],
      default: 'net-30'
    },
    method: {
      type: String,
      enum: ['bank-transfer', 'cheque', 'cash', 'credit', 'letter-of-credit'],
      default: 'bank-transfer'
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'overdue'],
      default: 'pending'
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    dueAmount: {
      type: Number,
      default: 0
    },
    dueDate: Date,
    paidAt: Date,
    invoiceNumber: String
  },
  qualityControl: {
    required: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'passed', 'failed', 'conditional-accept'],
      default: 'pending'
    },
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    inspectionDate: Date,
    testResults: [{
      parameter: String,
      value: String,
      unit: String,
      acceptable: Boolean,
      notes: String
    }],
    overallGrade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C', 'Rejected']
    },
    defectRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    notes: String
  },
  approvals: [{
    level: {
      type: Number,
      required: true
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedAt: Date,
    notes: String,
    conditions: [String]
  }],
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['purchase-order', 'invoice', 'receipt', 'quality-certificate', 'delivery-note', 'contract', 'other']
    },
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'note'],
      required: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    subject: String,
    content: String,
    contactPerson: String,
    date: {
      type: Date,
      default: Date.now
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    automatic: {
      type: Boolean,
      default: false
    }
  }],
  requirements: {
    urgency: {
      type: String,
      enum: ['immediate', 'within-week', 'within-month', 'flexible'],
      default: 'flexible'
    },
    specifications: String,
    qualityRequirements: String,
    packagingRequirements: String,
    certificationRequired: [String],
    minimumShelfLife: Number // in days
  },
  budget: {
    allocated: {
      type: Number,
      default: 0
    },
    approved: {
      type: Number,
      default: 0
    },
    actual: {
      type: Number,
      default: 0
    },
    variance: {
      type: Number,
      default: 0
    }
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
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
  tags: [String],
  notes: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'annually']
    },
    nextOrderDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
procurementSchema.index({ procurementNumber: 1, tenantId: 1 }, { unique: true });
procurementSchema.index({ supplier: 1 });
procurementSchema.index({ status: 1 });
procurementSchema.index({ procurementType: 1 });
procurementSchema.index({ priority: 1 });
procurementSchema.index({ 'delivery.expectedDate': 1 });
procurementSchema.index({ 'payment.dueDate': 1 });
procurementSchema.index({ requestedBy: 1 });
procurementSchema.index({ assignedTo: 1 });
procurementSchema.index({ tenantId: 1 });
procurementSchema.index({ createdAt: -1 });
procurementSchema.index({ 'qualityControl.status': 1 });

// Pre-save middleware to generate procurement number (Tally-style)
procurementSchema.pre('save', async function(next) {
  if (this.isNew && !this.procurementNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Tally-style series-based numbering
    const series = this.series || 'PO';
    
    // Find the last procurement in this series for this financial year and tenant
    const financialYearStart = month >= 4 ? year : year - 1; // April to March
    const seriesPattern = `^${series}/${financialYearStart}-${(financialYearStart + 1).toString().slice(-2)}/`;
    
    const lastProcurement = await this.constructor.findOne({
      procurementNumber: new RegExp(seriesPattern),
      tenantId: this.tenantId,
      series: series
    }).sort({ procurementNumber: -1 });
    
    let sequence = 1;
    if (lastProcurement) {
      const lastSequence = parseInt(lastProcurement.procurementNumber.split('/').pop());
      sequence = lastSequence + 1;
    }
    
    // Generate Tally-style number: PO/2024-25/0001
    this.procurementNumber = `${series}/${financialYearStart}-${(financialYearStart + 1).toString().slice(-2)}/${sequence.toString().padStart(4, '0')}`;
    
    // Generate voucher number for reference
    this.voucherNumber = `${series}${year}${month}${day}${sequence.toString().padStart(3, '0')}`;
  }
  next();
});

// Pre-save middleware to calculate totals (Tally-style accounting)
procurementSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.totalPrice = item.quantity * item.unitPrice;
  });
  
  // Tally-style accounting calculations
  this.accounting.grossAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.accounting.taxableAmount = this.accounting.grossAmount - this.accounting.discountAmount;
  
  // Calculate GST (like Tally)
  const taxableAmt = this.accounting.taxableAmount;
  
  // CGST calculation
  if (this.accounting.taxes.cgst.rate > 0) {
    this.accounting.taxes.cgst.amount = (taxableAmt * this.accounting.taxes.cgst.rate) / 100;
  }
  
  // SGST calculation
  if (this.accounting.taxes.sgst.rate > 0) {
    this.accounting.taxes.sgst.amount = (taxableAmt * this.accounting.taxes.sgst.rate) / 100;
  }
  
  // IGST calculation
  if (this.accounting.taxes.igst.rate > 0) {
    this.accounting.taxes.igst.amount = (taxableAmt * this.accounting.taxes.igst.rate) / 100;
  }
  
  // CESS calculation
  if (this.accounting.taxes.cess.rate > 0) {
    this.accounting.taxes.cess.amount = (taxableAmt * this.accounting.taxes.cess.rate) / 100;
  }
  
  // Total tax amount
  this.accounting.totalTaxAmount = 
    this.accounting.taxes.cgst.amount +
    this.accounting.taxes.sgst.amount +
    this.accounting.taxes.igst.amount +
    this.accounting.taxes.cess.amount;
  
  // Additional charges
  const additionalChargesTotal = this.accounting.additionalCharges.reduce((sum, charge) => {
    return sum + (charge.amount || 0);
  }, 0);
  
  // Calculate net amount before round off
  const beforeRoundOff = this.accounting.taxableAmount + this.accounting.totalTaxAmount + additionalChargesTotal;
  
  // Round off (Tally-style)
  this.accounting.netAmount = Math.round(beforeRoundOff);
  this.accounting.roundOff = this.accounting.netAmount - beforeRoundOff;
  
  // Update legacy pricing for backward compatibility
  this.pricing.subtotal = this.accounting.grossAmount;
  this.pricing.discount = this.accounting.discountAmount;
  this.pricing.tax = this.accounting.totalTaxAmount;
  this.pricing.total = this.accounting.netAmount;
  
  // Update payment calculations
  this.payment.dueAmount = this.accounting.netAmount - this.payment.paidAmount;
  
  // Update budget variance
  if (this.budget.approved > 0) {
    this.budget.actual = this.accounting.netAmount;
    this.budget.variance = this.budget.actual - this.budget.approved;
  }
  
  next();
});

// Pre-save middleware to update timeline
procurementSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.assignedTo || this.createdBy,
      automatic: false
    });
  }
  next();
});

// Virtual for procurement age in days
procurementSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for delivery status
procurementSchema.virtual('deliveryStatus').get(function() {
  if (!this.delivery.expectedDate) return 'No expected date';
  
  const today = new Date();
  const expected = new Date(this.delivery.expectedDate);
  
  if (this.delivery.actualDate) {
    const actual = new Date(this.delivery.actualDate);
    return actual <= expected ? 'On Time' : 'Late';
  }
  
  if (today > expected) {
    return 'Overdue';
  } else if (today.toDateString() === expected.toDateString()) {
    return 'Due Today';
  } else {
    const daysUntilDue = Math.ceil((expected - today) / (1000 * 60 * 60 * 24));
    return `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
  }
});

// Virtual for completion percentage
procurementSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  
  const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const receivedQuantity = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  
  return Math.round((receivedQuantity / totalQuantity) * 100);
});

// Virtual for approval status
procurementSchema.virtual('approvalStatus').get(function() {
  if (this.approvals.length === 0) return 'No approvals required';
  
  const pendingApprovals = this.approvals.filter(a => a.status === 'pending').length;
  const rejectedApprovals = this.approvals.filter(a => a.status === 'rejected').length;
  
  if (rejectedApprovals > 0) return 'Rejected';
  if (pendingApprovals === 0) return 'Fully Approved';
  return `${this.approvals.length - pendingApprovals}/${this.approvals.length} Approved`;
});

// Ensure virtual fields are serialized
procurementSchema.set('toJSON', { virtuals: true });

// Method to update item received quantity
procurementSchema.methods.updateReceivedQuantity = function(itemId, receivedQty, qualityGrade) {
  const item = this.items.id(itemId);
  if (item) {
    item.receivedQuantity = receivedQty;
    if (qualityGrade) {
      item.qualityGrade = qualityGrade;
    }
    
    // Auto-update status based on completion
    const completionPercentage = this.completionPercentage;
    if (completionPercentage === 100) {
      this.status = 'received';
    } else if (completionPercentage > 0) {
      this.status = 'partially-received';
    }
  }
  
  return this.save();
};

// Method to add approval
procurementSchema.methods.addApproval = function(level, approverId) {
  this.approvals.push({
    level,
    approver: approverId,
    status: 'pending'
  });
  
  return this.save();
};

// Method to approve/reject
procurementSchema.methods.processApproval = function(approvalId, status, notes, conditions = []) {
  const approval = this.approvals.id(approvalId);
  if (approval) {
    approval.status = status;
    approval.approvedAt = new Date();
    approval.notes = notes;
    if (conditions.length > 0) {
      approval.conditions = conditions;
    }
    
    // Update overall status
    if (status === 'rejected') {
      this.status = 'rejected';
    } else if (status === 'approved') {
      const allApproved = this.approvals.every(a => a.status === 'approved');
      if (allApproved) {
        this.status = 'approved';
      }
    }
  }
  
  return this.save();
};

// Method to add communication
procurementSchema.methods.addCommunication = function(commData) {
  this.communications.push({
    ...commData,
    date: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('Procurement', procurementSchema);