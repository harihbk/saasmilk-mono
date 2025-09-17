const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  igst: {
    type: Number,
    default: 0,
    min: [0, 'IGST cannot be negative'],
    max: [28, 'IGST cannot exceed 28%']
  },
  cgst: {
    type: Number,
    default: 0,
    min: [0, 'CGST cannot be negative'],
    max: [14, 'CGST cannot exceed 14%']
  },
  sgst: {
    type: Number,
    default: 0,
    min: [0, 'SGST cannot be negative'],
    max: [14, 'SGST cannot exceed 14%']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: function() {
      return this.orderType === 'customer';
    }
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: function() {
      return this.orderType === 'dealer';
    }
  },
  items: [orderItemSchema],
  orderType: {
    type: String,
    enum: ['customer', 'dealer', 'retail', 'wholesale', 'subscription', 'bulk'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'out-for-delivery',
      'delivered',
      'completed',
      'cancelled',
      'returned',
      'refunded'
    ],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
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
      required: true,
      min: [0, 'Total cannot be negative']
    },
    globalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Global discount cannot be negative']
    },
    globalDiscountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    customAdjustment: {
      text: {
        type: String,
        default: ''
      },
      amount: {
        type: Number,
        default: 0,
        min: [0, 'Custom adjustment amount cannot be negative']
      },
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'fixed'
      }
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'bank-transfer', 'digital-wallet', 'credit', 'cheque'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'partial', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    paidAt: Date,
    dueAmount: {
      type: Number,
      default: 0,
      min: [0, 'Due amount cannot be negative']
    },
    dueDate: Date
  },
  shipping: {
    address: {
      warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse'
      },
      street: { 
        type: String,
        default: ''
      },
      city: { 
        type: String,
        default: ''
      },
      state: { 
        type: String,
        default: ''
      },
      zipCode: { 
        type: String,
        default: ''
      },
      country: { 
        type: String,
        default: 'India'
      }
    },
    method: {
      type: String,
      enum: ['pickup', 'standard', 'express', 'overnight', 'same-day'],
      default: 'standard'
    },
    carrier: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    deliveryInstructions: String
  },
  notes: {
    customer: String,
    internal: String,
    delivery: String
  },
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
    notes: String
  }],
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
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
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
orderSchema.index({ orderNumber: 1, tenantId: 1 }, { unique: true }); // Composite unique index
orderSchema.index({ customer: 1 });
orderSchema.index({ dealer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ assignedTo: 1 });
orderSchema.index({ tenantId: 1 }); // Tenant isolation index

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Find the last order of the day for this tenant
    const lastOrder = await this.constructor.findOne({
      orderNumber: new RegExp(`^ORD${year}${month}${day}`),
      tenantId: this.tenantId
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    this.orderNumber = `ORD${year}${month}${day}${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.totalPrice = (item.quantity * item.unitPrice) - item.discount;
  });
  
  // Calculate order totals
  this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate base total before global discounts and adjustments
  let baseTotal = this.pricing.subtotal - this.pricing.discount + this.pricing.tax + this.pricing.shipping;
  
  // Apply global discount
  let globalDiscountAmount = 0;
  if (this.pricing.globalDiscountType === 'percentage') {
    globalDiscountAmount = (baseTotal * (this.pricing.globalDiscount || 0)) / 100;
  } else {
    globalDiscountAmount = this.pricing.globalDiscount || 0;
  }
  
  // Apply custom adjustment
  let customAdjustmentAmount = 0;
  if (this.pricing.customAdjustment?.amount > 0) {
    if (this.pricing.customAdjustment.type === 'percentage') {
      customAdjustmentAmount = (baseTotal * this.pricing.customAdjustment.amount) / 100;
    } else {
      customAdjustmentAmount = this.pricing.customAdjustment.amount;
    }
  }
  
  // Final total includes all discounts and adjustments
  this.pricing.total = baseTotal - globalDiscountAmount - customAdjustmentAmount;
  this.payment.dueAmount = this.pricing.total - this.payment.paidAmount;
  
  next();
});

// Pre-save middleware for automatic payment processing
orderSchema.pre('save', async function(next) {
  // Trigger automatic payment processing for:
  // 1. New orders with credit payment method
  // 2. Existing orders where payment method changed to credit and status is pending
  // 3. Existing orders with credit method that still have pending status (for updates)
  const shouldProcessPayment = (
    (this.isNew && this.orderType === 'dealer' && this.payment.method === 'credit' && this.payment.status === 'pending') ||
    (!this.isNew && this.isModified('payment.method') && this.payment.method === 'credit' && this.payment.status === 'pending' && this.orderType === 'dealer') ||
    (!this.isNew && this.payment.method === 'credit' && this.payment.status === 'pending' && this.orderType === 'dealer' && (this.isModified('payment') || this.isModified('pricing')))
  );
  
  console.log(`Order ${this.orderNumber || 'NEW'}: isNew=${this.isNew}, method=${this.payment.method}, status=${this.payment.status}, shouldProcess=${shouldProcessPayment}`);

  if (shouldProcessPayment) {
    try {
      const Dealer = mongoose.model('Dealer');
      const dealer = await Dealer.findById(this.dealer);
     
      if (dealer && dealer.financialInfo && Math.abs(dealer.financialInfo.currentBalance) >= this.pricing.total && dealer.financialInfo.currentBalance < 0) {
        console.log('------------');
        console.log(this.pricing);
       console.log('------------');
        console.log(dealer);
        // Dealer has sufficient balance, auto-complete payment
        this.payment.paidAmount = this.pricing.total;
        this.payment.dueAmount = 0;
        this.payment.status = 'completed';
        this.payment.paidAt = new Date();
        
        // Deduct from dealer credit (increase the balance towards 0)
        dealer.financialInfo.currentBalance += this.pricing.total;
        
        // Add transaction record to dealer
        dealer.transactions.push({
          type: 'debit',
          amount: this.pricing.total,
          description: `Invoice #${this.orderNumber} - ${this.items.length} item(s)`,
          reference: {
            type: 'Order',
            id: this._id
          },
          balanceAfter: dealer.financialInfo.currentBalance,
          date: new Date()
        });
        
        // Save dealer with updated balance and transaction
        await dealer.save();
        
        console.log(`Auto-completed payment for order ${this.orderNumber}: Deducted ₹${this.pricing.total} from dealer ${dealer.name}. New balance: ₹${dealer.financialInfo.currentBalance}`);
      } else {
        const reason = !dealer ? 'Dealer not found' : 
                      !dealer.financialInfo ? 'No financial info' :
                      dealer.financialInfo.currentBalance >= 0 ? 'No credit balance' :
                      Math.abs(dealer.financialInfo.currentBalance) < this.pricing.total ? `Insufficient credit (has ₹${Math.abs(dealer.financialInfo.currentBalance)}, needs ₹${this.pricing.total})` : 'Unknown reason';
        console.log(`Cannot auto-complete payment for order ${this.orderNumber}: ${reason}`);
      }
    } catch (error) {
      console.error('Error in automatic payment processing:', error);
    }
  }
  next();
});

// Pre-save middleware to update timeline
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.assignedTo || this.createdBy
    });
  }
  next();
});

// Virtual for order age in days
orderSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for payment status
orderSchema.virtual('paymentStatusText').get(function() {
  if (this.payment.paidAmount >= this.pricing.total) {
    return 'Fully Paid';
  } else if (this.payment.paidAmount > 0) {
    return 'Partially Paid';
  } else {
    return 'Unpaid';
  }
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });

// Custom validation for shipping address
orderSchema.pre('validate', async function(next) {
  if (this.shipping && this.shipping.method !== 'pickup') {
    // Validate shipping address fields when not pickup
    if (!this.shipping.address.street || this.shipping.address.street.trim() === '') {
      this.invalidate('shipping.address.street', 'Shipping street address is required for delivery orders');
    }
    if (!this.shipping.address.city || this.shipping.address.city.trim() === '') {
      this.invalidate('shipping.address.city', 'Shipping city is required for delivery orders');
    }
    if (!this.shipping.address.state || this.shipping.address.state.trim() === '') {
      this.invalidate('shipping.address.state', 'Shipping state is required for delivery orders');
    }
    if (!this.shipping.address.zipCode || this.shipping.address.zipCode.trim() === '') {
      this.invalidate('shipping.address.zipCode', 'Shipping zip code is required for delivery orders');
    }
  }
  
  // Validate warehouse belongs to same tenant
  if (this.shipping && this.shipping.address && this.shipping.address.warehouse && this.tenantId) {
    try {
      const Warehouse = mongoose.model('Warehouse');
      const warehouse = await Warehouse.findById(this.shipping.address.warehouse);
      
      if (!warehouse) {
        this.invalidate('shipping.address.warehouse', 'Warehouse not found');
      } else if (warehouse.tenantId !== this.tenantId) {
        this.invalidate('shipping.address.warehouse', `Warehouse belongs to different tenant (${warehouse.tenantId}). Order tenant: ${this.tenantId}`);
      }
    } catch (error) {
      console.error('Warehouse validation error:', error);
      this.invalidate('shipping.address.warehouse', 'Error validating warehouse');
    }
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);
