const express = require('express');
const { body, param } = require('express-validator');
const Product = require('../models/Product');
const { protect, authorize, checkSubscription } = require('../middleware/auth');
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
  validateSearch,
  validateDateRange
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all products
// @route   GET /api/products
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'brand', 'category', 'price.selling', 'createdAt']),
  validateSearch(['name', 'description', 'brand', 'sku']),
  validateDateRange
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { category, brand, status, isOrganic } = req.query;

    // Build query with tenant filter
    let query = req.tenantFilter || {};

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (category) query.category = category;
    if (brand) query.brand = new RegExp(brand, 'i');
    if (status) query.status = status;
    if (isOrganic !== undefined) query.isOrganic = isOrganic === 'true';

    // Add date range filter
    if (req.dateQuery) {
      query.createdAt = req.dateQuery;
    }

    // Execute query with pagination
    const products = await Product.find(query)
      .populate('category', 'name displayName')
      .populate('supplier', 'companyInfo.name contactInfo.primaryContact.name')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid product ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Add tenant filter to query
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const product = await Product.findOne(query)
      .populate('category', 'name displayName')
      .populate('supplier', 'companyInfo.name contactInfo.primaryContact')
      .populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('category')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('brand')
    .trim()
    .notEmpty()
    .withMessage('Brand is required'),
  body('sku')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters'),
  body('price.cost')
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  body('price.selling')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('packaging.type')
    .isIn(['bottle', 'carton', 'pouch', 'can', 'jar', 'bag', 'bulk'])
    .withMessage('Invalid packaging type'),
  body('packaging.size.value')
    .isFloat({ min: 0 })
    .withMessage('Package size must be a positive number'),
  body('packaging.size.unit')
    .isIn(['ml', 'l', 'g', 'kg', 'oz', 'lb'])
    .withMessage('Invalid package unit'),
  body('supplier')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user.id
    };

    const product = await Product.create(productData);

    // Populate the created product
    await product.populate('category', 'name displayName');
    await product.populate('supplier', 'companyInfo.name contactInfo.primaryContact.name');
    await product.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid product ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('price.cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  body('price.selling')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Add tenant filter to query
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const product = await Product.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('category', 'name displayName')
      .populate('supplier', 'companyInfo.name contactInfo.primaryContact.name')
      .populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid product ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Add tenant filter to query
    const query = { 
      _id: req.params.id,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const product = await Product.findOne(query);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Instead of hard delete, mark as discontinued
    product.status = 'discontinued';
    await product.save();

    res.json({
      success: true,
      message: 'Product marked as discontinued'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
});

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Private
router.get('/meta/categories', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const Category = require('../models/Category');
    
    // Get all active categories
    const query = { 
      isActive: true,
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const categories = await Category.find(query)
      .select('_id name displayName')
      .sort('order name');

    // Get category counts
    const categoryCounts = await Product.aggregate([
      { $match: { 
          status: 'active',
          ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
        } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoriesWithCounts = categories.map(category => {
      const found = categoryCounts.find(item => item._id && item._id.toString() === category._id.toString());
      return {
        _id: category._id,
        name: category.name,
        displayName: category.displayName,
        count: found ? found.count : 0
      };
    });

    res.json({
      success: true,
      data: { categories: categoriesWithCounts }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

// @desc    Get product brands
// @route   GET /api/products/brands
// @access  Private
router.get('/meta/brands', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const query = { 
      status: 'active',
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const brands = await Product.distinct('brand', query);

    res.json({
      success: true,
      data: { brands }
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching brands'
    });
  }
});

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
router.get('/alerts/low-stock', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination
], async (req, res) => {
  try {
    const { page, limit, skip } = req.query;

    // This would typically join with inventory data
    // For now, we'll use the minStockLevel from product
    const query = {
      status: 'active',
      minStockLevel: { $gt: 0 },
      ...(req.user.role !== 'super_admin' ? { tenantId: req.tenant.id } : {})
    };

    const products = await Product.find(query)
      .populate('supplier', 'companyInfo.name')
      .sort({ minStockLevel: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock products'
    });
  }
});

// @desc    Get product statistics
// @route   GET /api/products/meta/stats
// @access  Private (Admin, Manager)
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    // Build match stage with tenant isolation
    const matchStage = req.user.role !== 'super_admin' 
      ? { $match: { tenantId: req.tenant.id } }
      : { $match: {} };
    
    const stats = await Product.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          averageBasePrice: { $avg: '$pricing.basePrice' },
          totalValue: { $sum: '$pricing.basePrice' }
        }
      }
    ]);

    const categoryStats = await Product.aggregate([
      matchStage,
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$pricing.basePrice' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          averagePrice: 1,
          categoryName: { $arrayElemAt: ['$categoryInfo.displayName', 0] }
        }
      }
    ]);

    const brandStats = await Product.aggregate([
      matchStage,
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          averagePrice: { $avg: '$pricing.basePrice' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        productStats: stats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          inactiveProducts: 0,
          averageBasePrice: 0,
          totalValue: 0
        },
        categoryStats,
        brandStats
      }
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product statistics'
    });
  }
});

module.exports = router;
