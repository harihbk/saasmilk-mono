const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { 
  extractTenant, 
  validateTenantAccess, 
  autoTenantFilter,
  checkSubscriptionLimit 
} = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch
} = require('../middleware/validation');
const Category = require('../models/Category');

const router = express.Router();

// Function to initialize default categories for a specific tenant
const initializeDefaultCategoriesForTenant = async (tenantId, userId) => {
  try {
    const count = await Category.countDocuments({ tenantId });
    if (count === 0) {
      const defaultCategories = [
        { name: 'whole-milk', displayName: 'Whole Milk', description: 'Full-fat milk products', order: 1 },
        { name: 'skim-milk', displayName: 'Skim Milk', description: 'Fat-free milk products', order: 2 },
        { name: 'low-fat-milk', displayName: 'Low Fat Milk', description: 'Reduced fat milk products', order: 3 },
        { name: 'organic-milk', displayName: 'Organic Milk', description: 'Organic milk products', order: 4 },
        { name: 'flavored-milk', displayName: 'Flavored Milk', description: 'Flavored milk products', order: 5 },
        { name: 'cream', displayName: 'Cream', description: 'Cream products', order: 6 },
        { name: 'butter', displayName: 'Butter', description: 'Butter products', order: 7 },
        { name: 'cheese', displayName: 'Cheese', description: 'Cheese products', order: 8 },
        { name: 'yogurt', displayName: 'Yogurt', description: 'Yogurt products', order: 9 },
        { name: 'ice-cream', displayName: 'Ice Cream', description: 'Ice cream products', order: 10 },
        { name: 'milk-powder', displayName: 'Milk Powder', description: 'Powdered milk products', order: 11 },
        { name: 'condensed-milk', displayName: 'Condensed Milk', description: 'Condensed milk products', order: 12 },
        { name: 'other', displayName: 'Other', description: 'Other dairy products', order: 13 }
      ];
      
      for (const cat of defaultCategories) {
        await Category.create({ 
          ...cat, 
          createdBy: userId,
          tenantId: tenantId 
        });
      }
      console.log(`Default categories initialized for tenant ${tenantId}`);
    }
  } catch (error) {
    console.error(`Error initializing default categories for tenant ${tenantId}:`, error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'displayName', 'createdAt', 'order']),
  validateSearch(['name', 'displayName', 'description'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { isActive } = req.query;

    // Build query with tenant filter
    let query = req.tenantFilter || {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Execute query
    const categories = await Category.find(query)
      .sort(sort || { order: 1, name: 1 })
      .limit(limit)
      .skip(skip)
      .populate('createdBy', 'name email');

    const total = await Category.countDocuments(query);

    res.json({
      success: true,
      data: {
        categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid category ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const category = await Category.findOne(query)
      .populate('parent', 'name displayName')
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category'
    });
  }
});

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Category name must contain only lowercase letters, numbers, and hyphens'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, displayName, description, parent, order, icon } = req.body;

    // Check if category already exists within this tenant
    const existingCategory = await Category.findOne({ 
      name, 
      tenantId: req.body.tenantId 
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category
    const category = await Category.create({
      name,
      displayName,
      description: description || '',
      parent: parent || null,
      order: order || 0,
      icon: icon || null,
      createdBy: req.user._id,
      tenantId: req.body.tenantId // Added by autoTenantFilter middleware
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating category'
    });
  }
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid category ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Category name must contain only lowercase letters, numbers, and hyphens'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const category = await Category.findOne(query);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if name already exists (if updating name)
    if (req.body.name && req.body.name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: req.body.name,
        ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update category
    Object.assign(category, req.body);
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating category'
    });
  }
});

// @desc    Delete category (deactivate)
// @route   DELETE /api/categories/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid category ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const category = await Category.findOne(query);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const hasProducts = await category.hasProducts();
    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has products. Please deactivate instead.'
      });
    }

    // Deactivate instead of hard delete
    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Category deactivated successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category'
    });
  }
});

// @desc    Get active categories for dropdown
// @route   GET /api/categories/active
// @access  Private
router.get('/meta/active', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const query = { 
      isActive: true,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const activeCategories = await Category.find(query)
      .sort('order name')
      .select('_id name displayName description');

    const formattedCategories = activeCategories.map(cat => ({
      value: cat._id.toString(),
      label: cat.displayName,
      name: cat.name,
      description: cat.description
    }));

    res.json({
      success: true,
      data: { categories: formattedCategories }
    });
  } catch (error) {
    console.error('Get active categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active categories'
    });
  }
});

module.exports = router;
