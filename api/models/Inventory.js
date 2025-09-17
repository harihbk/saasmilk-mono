const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  location: {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse is required']
    },
    zone: String,
    aisle: String,
    shelf: String,
    bin: String
  },
  stock: {
    available: {
      type: Number,
      required: [true, 'Available stock is required'],
      min: [0, 'Available stock cannot be negative'],
      default: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    },
    damaged: {
      type: Number,
      default: 0,
      min: [0, 'Damaged stock cannot be negative']
    },
    expired: {
      type: Number,
      default: 0,
      min: [0, 'Expired stock cannot be negative']
    },
    inTransit: {
      type: Number,
      default: 0,
      min: [0, 'In-transit stock cannot be negative']
    }
  },
  pricing: {
    averageCost: {
      type: Number,
      default: 0,
      min: [0, 'Average cost cannot be negative']
    },
    lastPurchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Last purchase price cannot be negative']
    },
    totalValue: {
      type: Number,
      default: 0,
      min: [0, 'Total value cannot be negative']
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
  thresholds: {
    minimum: {
      type: Number,
      required: [true, 'Minimum threshold is required'],
      min: [0, 'Minimum threshold cannot be negative']
    },
    maximum: {
      type: Number,
      min: [0, 'Maximum threshold cannot be negative']
    },
    reorderPoint: {
      type: Number,
      min: [0, 'Reorder point cannot be negative']
    },
    reorderQuantity: {
      type: Number,
      min: [0, 'Reorder quantity cannot be negative']
    }
  },
  batches: [{
    batchNumber: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Batch quantity cannot be negative']
    },
    manufactureDate: Date,
    expiryDate: Date,
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    purchasePrice: Number,
    receivedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'damaged', 'recalled'],
      default: 'active'
    },
    qualityCheck: {
      passed: {
        type: Boolean,
        default: true
      },
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      checkedAt: Date,
      notes: String
    }
  }],
  movements: [{
    type: {
      type: String,
      enum: ['in', 'out', 'transfer', 'adjustment', 'damage', 'expiry'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: String,
    reference: {
      type: String, // Order ID, Transfer ID, etc.
    },
    batchNumber: String,
    fromLocation: String,
    toLocation: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['low-stock', 'out-of-stock', 'expiring-soon', 'expired', 'damaged', 'overstock'],
      required: true
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date
  }],
  lastStockTake: {
    date: Date,
    countedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    systemCount: Number,
    physicalCount: Number,
    variance: Number,
    notes: String
  },
  settings: {
    trackBatches: {
      type: Boolean,
      default: true
    },
    autoReorder: {
      type: Boolean,
      default: false
    },
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
    }
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

// Compound index for product, location and tenant
inventorySchema.index({ product: 1, 'location.warehouse': 1, tenantId: 1 }, { unique: true });
inventorySchema.index({ 'stock.available': 1 });
inventorySchema.index({ 'thresholds.minimum': 1 });
inventorySchema.index({ 'batches.expiryDate': 1 });
inventorySchema.index({ 'alerts.isActive': 1, 'alerts.type': 1 });
inventorySchema.index({ tenantId: 1 }); // Tenant isolation index

// Virtual for total stock
inventorySchema.virtual('totalStock').get(function() {
  return this.stock.available + this.stock.reserved + this.stock.damaged + this.stock.expired;
});

// Virtual for usable stock
inventorySchema.virtual('usableStock').get(function() {
  return this.stock.available + this.stock.reserved;
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.stock.available === 0) return 'out-of-stock';
  if (this.stock.available <= this.thresholds.minimum) return 'low-stock';
  if (this.thresholds.maximum && this.stock.available >= this.thresholds.maximum) return 'overstock';
  return 'in-stock';
});

// Virtual for days until expiry (earliest batch)
inventorySchema.virtual('daysUntilExpiry').get(function() {
  const activeBatches = this.batches.filter(batch => 
    batch.status === 'active' && batch.expiryDate && batch.quantity > 0
  );
  
  if (activeBatches.length === 0) return null;
  
  const earliestExpiry = activeBatches.reduce((earliest, batch) => 
    batch.expiryDate < earliest ? batch.expiryDate : earliest, 
    activeBatches[0].expiryDate
  );
  
  return Math.ceil((earliestExpiry - Date.now()) / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
inventorySchema.set('toJSON', { virtuals: true });

// Pre-save middleware to calculate total value
inventorySchema.pre('save', function(next) {
  this.pricing.totalValue = this.stock.available * this.pricing.averageCost;
  next();
});

// Pre-save middleware to generate alerts
inventorySchema.pre('save', function(next) {
  const newAlerts = [];
  
  // Check for low stock
  if (this.stock.available <= this.thresholds.minimum && this.stock.available > 0) {
    const existingAlert = this.alerts.find(alert => 
      alert.type === 'low-stock' && alert.isActive
    );
    
    if (!existingAlert) {
      newAlerts.push({
        type: 'low-stock',
        message: `Stock level is below minimum threshold (${this.thresholds.minimum})`,
        severity: 'medium'
      });
    }
  }
  
  // Check for out of stock
  if (this.stock.available === 0) {
    const existingAlert = this.alerts.find(alert => 
      alert.type === 'out-of-stock' && alert.isActive
    );
    
    if (!existingAlert) {
      newAlerts.push({
        type: 'out-of-stock',
        message: 'Product is out of stock',
        severity: 'high'
      });
    }
  }
  
  // Check for expiring batches
  const expiringBatches = this.batches.filter(batch => {
    if (batch.status !== 'active' || !batch.expiryDate || batch.quantity === 0) return false;
    const daysUntilExpiry = Math.ceil((batch.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  });
  
  if (expiringBatches.length > 0) {
    const existingAlert = this.alerts.find(alert => 
      alert.type === 'expiring-soon' && alert.isActive
    );
    
    if (!existingAlert) {
      newAlerts.push({
        type: 'expiring-soon',
        message: `${expiringBatches.length} batch(es) expiring within 7 days`,
        severity: 'medium'
      });
    }
  }
  
  // Add new alerts
  this.alerts.push(...newAlerts);
  
  next();
});

// Method to add stock movement
inventorySchema.methods.addMovement = function(movementData) {
  this.movements.push({
    ...movementData,
    timestamp: new Date()
  });
  
  // Update stock based on movement type
  switch (movementData.type) {
    case 'in':
      this.stock.available += movementData.quantity;
      break;
    case 'out':
      this.stock.available -= movementData.quantity;
      break;
    case 'damage':
      this.stock.available -= movementData.quantity;
      this.stock.damaged += movementData.quantity;
      break;
    case 'expiry':
      this.stock.available -= movementData.quantity;
      this.stock.expired += movementData.quantity;
      break;
    case 'adjustment':
      this.stock.available = movementData.quantity; // Set to exact quantity
      break;
  }
  
  this.lastUpdatedBy = movementData.performedBy;
  return this.save();
};

// Method to reserve stock
inventorySchema.methods.reserveStock = function(quantity, performedBy) {
  if (this.stock.available < quantity) {
    throw new Error('Insufficient stock available for reservation');
  }
  
  this.stock.available -= quantity;
  this.stock.reserved += quantity;
  
  this.addMovement({
    type: 'out',
    quantity: quantity,
    reason: 'Stock reserved for order',
    performedBy: performedBy
  });
  
  return this.save();
};

// Method to release reserved stock
inventorySchema.methods.releaseReservedStock = function(quantity, performedBy) {
  if (this.stock.reserved < quantity) {
    throw new Error('Insufficient reserved stock to release');
  }
  
  this.stock.reserved -= quantity;
  this.stock.available += quantity;
  
  this.addMovement({
    type: 'in',
    quantity: quantity,
    reason: 'Reserved stock released',
    performedBy: performedBy
  });
  
  return this.save();
};

// Method to acknowledge alert
inventorySchema.methods.acknowledgeAlert = function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.isActive = false;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Inventory', inventorySchema);
