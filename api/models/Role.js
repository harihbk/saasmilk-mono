const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
    uppercase: true,
    maxlength: [50, 'Role name cannot be more than 50 characters']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  permissions: {
    users: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    products: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    orders: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    customers: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    dealers: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    suppliers: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    inventory: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      read: { type: Boolean, default: true }
    },
    settings: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    routes: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tenantId: {
    type: String,
    uppercase: true,
    index: true
    // Optional for global system roles
  }
}, {
  timestamps: true
});

// Index for better query performance
roleSchema.index({ name: 1, tenantId: 1 }, { unique: true, sparse: true }); // Composite unique index (sparse for global roles)
roleSchema.index({ isActive: 1 });
roleSchema.index({ tenantId: 1 }); // Tenant isolation index

// Pre-save middleware to generate role name from display name if not provided
roleSchema.pre('save', function(next) {
  if (!this.name && this.displayName) {
    this.name = this.displayName.toUpperCase().replace(/\s+/g, '_');
  }
  next();
});

// Static method to create default roles
roleSchema.statics.createDefaultRoles = async function() {
  const defaultRoles = [
    {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      isSystem: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        products: { create: true, read: true, update: true, delete: true },
        orders: { create: true, read: true, update: true, delete: true },
        customers: { create: true, read: true, update: true, delete: true },
        dealers: { create: true, read: true, update: true, delete: true },
        suppliers: { create: true, read: true, update: true, delete: true },
        inventory: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { create: true, read: true, update: true, delete: true },
        routes: { create: true, read: true, update: true, delete: true }
      }
    },
    {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Management access with most permissions except user management',
      isSystem: true,
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        products: { create: true, read: true, update: true, delete: false },
        orders: { create: true, read: true, update: true, delete: false },
        customers: { create: true, read: true, update: true, delete: false },
        dealers: { create: true, read: true, update: true, delete: false },
        suppliers: { create: true, read: true, update: true, delete: false },
        inventory: { create: true, read: true, update: true, delete: false },
        reports: { read: true },
        settings: { create: false, read: true, update: false, delete: false },
        routes: { create: true, read: true, update: true, delete: false }
      }
    },
    {
      name: 'EMPLOYEE',
      displayName: 'Employee',
      description: 'Standard employee access for daily operations',
      isSystem: true,
      permissions: {
        users: { create: false, read: false, update: false, delete: false },
        products: { create: false, read: true, update: false, delete: false },
        orders: { create: true, read: true, update: true, delete: false },
        customers: { create: true, read: true, update: true, delete: false },
        dealers: { create: false, read: true, update: false, delete: false },
        suppliers: { create: false, read: true, update: false, delete: false },
        inventory: { create: false, read: true, update: false, delete: false },
        reports: { read: true },
        settings: { create: false, read: false, update: false, delete: false },
        routes: { create: false, read: true, update: false, delete: false }
      }
    },
    {
      name: 'VIEWER',
      displayName: 'Viewer',
      description: 'Read-only access for viewing data',
      isSystem: true,
      permissions: {
        users: { create: false, read: false, update: false, delete: false },
        products: { create: false, read: true, update: false, delete: false },
        orders: { create: false, read: true, update: false, delete: false },
        customers: { create: false, read: true, update: false, delete: false },
        dealers: { create: false, read: true, update: false, delete: false },
        suppliers: { create: false, read: true, update: false, delete: false },
        inventory: { create: false, read: true, update: false, delete: false },
        reports: { read: true },
        settings: { create: false, read: false, update: false, delete: false },
        routes: { create: false, read: true, update: false, delete: false }
      }
    }
  ];

  const createdRoles = [];
  for (const roleData of defaultRoles) {
    try {
      const existingRole = await this.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = await this.create(roleData);
        createdRoles.push(role);
      }
    } catch (error) {
      console.error(`Error creating role ${roleData.name}:`, error);
    }
  }

  return createdRoles;
};

module.exports = mongoose.model('Role', roleSchema);