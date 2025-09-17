const express = require('express');
const { body, param } = require('express-validator');
const DealerGroup = require('../models/DealerGroup');
const DealerGroupPricing = require('../models/DealerGroupPricing');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all dealer groups
// @route   GET /api/dealer-groups
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['name', 'code', 'dealerCount', 'createdAt']),
  validateSearch(['name', 'code', 'description'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { isActive } = req.query;

    // Build query
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Execute query
    const dealerGroups = await DealerGroup.find(query)
      .populate('totalDealers')
      .populate('activeDealers')
      .populate('createdBy', 'name email')
      .sort(sort || { name: 1 })
      .limit(limit)
      .skip(skip);

    const total = await DealerGroup.countDocuments(query);

    res.json({
      success: true,
      data: {
        dealerGroups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get dealer groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealer groups'
    });
  }
});

// @desc    Get single dealer group
// @route   GET /api/dealer-groups/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer group ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const dealerGroup = await DealerGroup.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('totalDealers')
      .populate('activeDealers')
      .populate('createdBy', 'name email');

    if (!dealerGroup) {
      return res.status(404).json({
        success: false,
        message: 'Dealer group not found'
      });
    }

    res.json({
      success: true,
      data: { dealerGroup }
    });
  } catch (error) {
    console.error('Get dealer group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealer group'
    });
  }
});

// @desc    Create new dealer group
// @route   POST /api/dealer-groups
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
    .withMessage('Group name must be between 1 and 100 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Group code must be between 1 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Group code must contain only uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  body('creditDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Credit days must be a positive integer'),
  body('commissionPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission percentage must be between 0 and 100'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  handleValidationErrors
], async (req, res) => {
  try {
    const groupData = {
      ...req.body,
      ...req.tenantFilter,
      createdBy: req.user._id
    };

    const dealerGroup = await DealerGroup.create(groupData);

    // Populate the created group
    await dealerGroup.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Dealer group created successfully',
      data: { dealerGroup }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Dealer group with this ${field} already exists`
      });
    }

    console.error('Create dealer group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating dealer group'
    });
  }
});

// @desc    Update dealer group
// @route   PUT /api/dealer-groups/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer group ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Group code must be between 1 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Group code must contain only uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  body('creditDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Credit days must be a positive integer'),
  body('commissionPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission percentage must be between 0 and 100'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  handleValidationErrors
], async (req, res) => {
  try {
    const dealerGroup = await DealerGroup.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('totalDealers')
      .populate('activeDealers')
      .populate('createdBy', 'name email');

    if (!dealerGroup) {
      return res.status(404).json({
        success: false,
        message: 'Dealer group not found'
      });
    }

    res.json({
      success: true,
      message: 'Dealer group updated successfully',
      data: { dealerGroup }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Dealer group with this ${field} already exists`
      });
    }

    console.error('Update dealer group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating dealer group'
    });
  }
});

// @desc    Delete dealer group (deactivate)
// @route   DELETE /api/dealer-groups/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer group ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const dealerGroup = await DealerGroup.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!dealerGroup) {
      return res.status(404).json({
        success: false,
        message: 'Dealer group not found'
      });
    }

    // Check if group has active dealers
    const Dealer = require('../models/Dealer');
    const activeDealers = await Dealer.countDocuments({ 
      dealerGroup: req.params.id, 
      isActive: true,
      ...req.tenantFilter
    });

    if (activeDealers > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete group with ${activeDealers} active dealers. Please deactivate or move them first.`
      });
    }

    // Deactivate instead of hard delete
    dealerGroup.isActive = false;
    await dealerGroup.save();

    res.json({
      success: true,
      message: 'Dealer group deactivated successfully'
    });
  } catch (error) {
    console.error('Delete dealer group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting dealer group'
    });
  }
});

// @desc    Get active dealer groups for dropdown
// @route   GET /api/dealer-groups/meta/active
// @access  Private
router.get('/meta/active', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const activeGroups = await DealerGroup.find({ isActive: true, ...req.tenantFilter });

    const formattedGroups = activeGroups.map(group => ({
      value: group._id.toString(),
      label: group.name,
      code: group.code,
      color: group.color,
      creditLimit: group.creditLimit,
      creditDays: group.creditDays,
      discountPercentage: group.discountPercentage,
      commissionPercentage: group.commissionPercentage
    }));

    res.json({
      success: true,
      data: { dealerGroups: formattedGroups }
    });
  } catch (error) {
    console.error('Get active dealer groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active dealer groups'
    });
  }
});

// @desc    Get dealer group statistics
// @route   GET /api/dealer-groups/meta/stats
// @access  Private
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    const totalGroups = await DealerGroup.countDocuments(req.tenantFilter);
    const activeGroups = await DealerGroup.countDocuments({ isActive: true, ...req.tenantFilter });
    const inactiveGroups = totalGroups - activeGroups;

    // Get groups with dealer counts
    const groupsWithDealers = await DealerGroup.aggregate([
      { $match: req.tenantFilter },
      {
        $lookup: {
          from: 'dealers',
          localField: '_id',
          foreignField: 'dealerGroup',
          as: 'dealers'
        }
      },
      {
        $project: {
          name: 1,
          dealerCount: { $size: '$dealers' },
          activeDealerCount: {
            $size: {
              $filter: {
                input: '$dealers',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          }
        }
      },
      { $sort: { dealerCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalGroups,
          activeGroups,
          inactiveGroups
        },
        topGroups: groupsWithDealers
      }
    });
  } catch (error) {
    console.error('Get dealer group stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dealer group statistics'
    });
  }
});

// ========== PRICING MANAGEMENT ROUTES ==========

// @desc    Get pricing for a dealer group
// @route   GET /api/dealer-groups/:id/pricing
// @access  Private
router.get('/:id/pricing', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer group ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Verify dealer group exists
    const dealerGroup = await DealerGroup.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!dealerGroup) {
      return res.status(404).json({
        success: false,
        message: 'Dealer group not found'
      });
    }

    // Get pricing for this group
    let pricingQuery = { dealerGroup: req.params.id, ...req.tenantFilter };
    if (includeInactive !== 'true') {
      pricingQuery.isActive = true;
    }

    const pricing = await DealerGroupPricing.find(pricingQuery)
      .populate('product', 'name sku brand category price packaging status')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ 'product.name': 1 });

    // Get all active products for adding new pricing
    const allProducts = await Product.find({ status: 'active', ...req.tenantFilter })
      .select('_id name sku brand category price packaging tax')
      .sort('name');

    // Find products without pricing in this group
    // Filter out null products (deleted products)
    const validPricing = pricing.filter(p => p.product !== null);
    const productsWithPricing = validPricing.map(p => p.product._id.toString());
    const productsWithoutPricing = allProducts.filter(
      product => !productsWithPricing.includes(product._id.toString())
    );

    res.json({
      success: true,
      data: {
        dealerGroup: {
          _id: dealerGroup._id,
          name: dealerGroup.name,
          code: dealerGroup.code
        },
        pricing: validPricing,
        productsWithoutPricing,
        stats: {
          totalProducts: allProducts.length,
          productsWithPricing: validPricing.length,
          productsWithoutPricing: productsWithoutPricing.length
        }
      }
    });
  } catch (error) {
    console.error('Get dealer group pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pricing'
    });
  }
});

// @desc    Set/Update pricing for a product in dealer group
// @route   POST /api/dealer-groups/:id/pricing
// @access  Private
router.post('/:id/pricing', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer group ID'),
  sanitizeInput,
  body('product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('pricing.basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('pricing.sellingPrice')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('pricing.discountType')
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
  body('pricing.discountValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('tax.igst')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('IGST must be between 0 and 100'),
  body('tax.cgst')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('CGST must be between 0 and 100'),
  body('tax.sgst')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('SGST must be between 0 and 100'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Verify dealer group exists
    const dealerGroup = await DealerGroup.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!dealerGroup) {
      return res.status(404).json({
        success: false,
        message: 'Dealer group not found'
      });
    }

    // Verify product exists
    const product = await Product.findOne({ _id: req.body.product, ...req.tenantFilter });
    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product not found'
      });
    }

    const pricingData = {
      dealerGroup: req.params.id,
      product: req.body.product,
      pricing: req.body.pricing,
      tax: req.body.tax || {},
      minOrderQuantity: req.body.minOrderQuantity || 1,
      maxOrderQuantity: req.body.maxOrderQuantity,
      effectiveFrom: req.body.effectiveFrom || new Date(),
      effectiveTo: req.body.effectiveTo,
      notes: req.body.notes,
      ...req.tenantFilter
    };

    // Use upsert to update existing or create new
    const pricing = await DealerGroupPricing.findOneAndUpdate(
      { dealerGroup: req.params.id, product: req.body.product, ...req.tenantFilter },
      { 
        ...pricingData,
        updatedBy: req.user._id,
        $setOnInsert: { createdBy: req.user._id } // Only set createdBy when creating new document
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    )
      .populate('product', 'name sku brand category')
      .populate('dealerGroup', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Pricing updated successfully',
      data: { pricing }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Pricing already exists for this product in this dealer group'
      });
    }

    console.error('Set dealer group pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting pricing'
    });
  }
});

// @desc    Update pricing for a product in dealer group
// @route   PUT /api/dealer-groups/:groupId/pricing/:pricingId
// @access  Private
router.put('/:groupId/pricing/:pricingId', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('groupId').isMongoId().withMessage('Invalid dealer group ID'),
  param('pricingId').isMongoId().withMessage('Invalid pricing ID'),
  sanitizeInput,
  handleValidationErrors
], async (req, res) => {
  try {
    const pricing = await DealerGroupPricing.findOne({
      _id: req.params.pricingId,
      dealerGroup: req.params.groupId,
      ...req.tenantFilter
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: 'Pricing not found'
      });
    }

    // Update pricing - only update allowed fields, preserve createdBy
    const allowedUpdates = ['pricing', 'tax', 'minOrderQuantity', 'maxOrderQuantity', 'effectiveFrom', 'effectiveTo', 'notes', 'isActive'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        pricing[field] = req.body[field];
      }
    });
    
    pricing.updatedBy = req.user._id;
    await pricing.save();

    await pricing.populate('product', 'name sku brand category');
    await pricing.populate('dealerGroup', 'name code');
    await pricing.populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Pricing updated successfully',
      data: { pricing }
    });
  } catch (error) {
    console.error('Update dealer group pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating pricing'
    });
  }
});

// @desc    Delete pricing for a product in dealer group
// @route   DELETE /api/dealer-groups/:groupId/pricing/:pricingId
// @access  Private
router.delete('/:groupId/pricing/:pricingId', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('groupId').isMongoId().withMessage('Invalid dealer group ID'),
  param('pricingId').isMongoId().withMessage('Invalid pricing ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const pricing = await DealerGroupPricing.findOneAndDelete({
      _id: req.params.pricingId,
      dealerGroup: req.params.groupId,
      ...req.tenantFilter
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: 'Pricing not found'
      });
    }

    res.json({
      success: true,
      message: 'Pricing deleted successfully'
    });
  } catch (error) {
    console.error('Delete dealer group pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting pricing'
    });
  }
});

// @desc    Bulk update pricing for dealer group
// @route   POST /api/dealer-groups/:id/pricing/bulk
// @access  Private
router.post('/:id/pricing/bulk', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid dealer group ID'),
  body('action')
    .isIn(['update_discount', 'update_tax', 'copy_from_group', 'sync_with_products'])
    .withMessage('Invalid bulk action'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { action, data } = req.body;
    const groupId = req.params.id;

    let result = {};

    switch (action) {
      case 'update_discount':
        // Update discount for all products in group
        const discountUpdate = await DealerGroupPricing.updateMany(
          { dealerGroup: groupId, isActive: true, ...req.tenantFilter },
          {
            'pricing.discountType': data.discountType,
            'pricing.discountValue': data.discountValue,
            updatedBy: req.user._id
          }
        );
        result = { updated: discountUpdate.modifiedCount };
        break;

      case 'update_tax':
        // Update tax rates for all products in group
        const taxUpdate = await DealerGroupPricing.updateMany(
          { dealerGroup: groupId, isActive: true, ...req.tenantFilter },
          {
            'tax.igst': data.igst || 0,
            'tax.cgst': data.cgst || 0,
            'tax.sgst': data.sgst || 0,
            updatedBy: req.user._id
          }
        );
        result = { updated: taxUpdate.modifiedCount };
        break;

      case 'copy_from_group':
        // Copy pricing from another dealer group
        const sourcePricing = await DealerGroupPricing.find({
          dealerGroup: data.sourceGroupId,
          isActive: true,
          ...req.tenantFilter
        });

        const copyPromises = sourcePricing.map(async (sourcePricing) => {
          return DealerGroupPricing.findOneAndUpdate(
            { dealerGroup: groupId, product: sourcePricing.product, ...req.tenantFilter },
            {
              pricing: sourcePricing.pricing,
              tax: sourcePricing.tax,
              minOrderQuantity: sourcePricing.minOrderQuantity,
              maxOrderQuantity: sourcePricing.maxOrderQuantity,
              updatedBy: req.user._id,
              $setOnInsert: { createdBy: req.user._id }
            },
            { upsert: true, new: true }
          );
        });

        const copiedPricing = await Promise.all(copyPromises);
        result = { copied: copiedPricing.length };
        break;

      case 'sync_with_products':
        // Sync with product base prices
        const products = await Product.find({ status: 'active', ...req.tenantFilter });
        const syncPromises = products.map(async (product) => {
          const basePrice = product.price?.cost || 0;
          const sellingPrice = product.price?.selling || 0;
          
          return DealerGroupPricing.findOneAndUpdate(
            { dealerGroup: groupId, product: product._id, ...req.tenantFilter },
            {
              'pricing.basePrice': basePrice,
              'pricing.sellingPrice': sellingPrice,
              'tax.igst': product.tax?.igst || 0,
              'tax.cgst': product.tax?.cgst || 0,
              'tax.sgst': product.tax?.sgst || 0,
              updatedBy: req.user._id,
              $setOnInsert: { 
                createdBy: req.user._id,
                dealerGroup: groupId,
                product: product._id,
                minOrderQuantity: 1
              }
            },
            { upsert: true, new: true }
          );
        });

        const syncedPricing = await Promise.all(syncPromises);
        result = { synced: syncedPricing.length };
        break;
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: result
    });
  } catch (error) {
    console.error('Bulk pricing update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while performing bulk update'
    });
  }
});

// @desc    Get pricing comparison across dealer groups
// @route   GET /api/dealer-groups/pricing/compare
// @access  Private
router.get('/pricing/compare', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination
], async (req, res) => {
  try {
    const { productId, groupIds } = req.query;

    let query = { isActive: true, ...req.tenantFilter };
    
    if (productId) {
      query.product = productId;
    }
    
    if (groupIds) {
      const groupIdArray = Array.isArray(groupIds) ? groupIds : [groupIds];
      query.dealerGroup = { $in: groupIdArray };
    }

    const pricing = await DealerGroupPricing.find(query)
      .populate('product', 'name sku brand category')
      .populate('dealerGroup', 'name code color')
      .sort({ 'product.name': 1, 'pricing.finalPrice': 1 });

    // Group by product for comparison
    const groupedPricing = pricing.reduce((acc, item) => {
      const productId = item.product._id.toString();
      if (!acc[productId]) {
        acc[productId] = {
          product: item.product,
          pricing: []
        };
      }
      acc[productId].pricing.push({
        dealerGroup: item.dealerGroup,
        pricing: item.pricing,
        tax: item.tax,
        finalPrice: item.pricing.finalPrice,
        priceWithTax: item.tax.priceWithTax
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        comparison: Object.values(groupedPricing),
        totalProducts: Object.keys(groupedPricing).length
      }
    });
  } catch (error) {
    console.error('Get pricing comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pricing comparison'
    });
  }
});

module.exports = router;