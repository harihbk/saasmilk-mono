const express = require('express');
const { body, param } = require('express-validator');
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch,
  validateDateRange
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort(['companyInfo.name', 'status', 'qualityStandards.qualityGrade', 'createdAt']),
  validateSearch(['companyInfo.name', 'companyInfo.legalName', 'contactInfo.primaryContact.email']),
  validateDateRange
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, businessType, qualityGrade, assignedBuyer } = req.query;

    // Build query with tenant isolation from middleware
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (status) query.status = status;
    if (businessType) query['companyInfo.businessType'] = businessType;
    if (qualityGrade) query['qualityStandards.qualityGrade'] = qualityGrade;
    if (assignedBuyer) query.assignedBuyer = assignedBuyer;

    // Add date range filter
    if (req.dateQuery) {
      query.createdAt = req.dateQuery;
    }


    // Execute query with pagination
    const suppliers = await Supplier.find(query)
      .populate('assignedBuyer', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Supplier.countDocuments(query);

    res.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching suppliers'
    });
  }
});

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid supplier ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const supplier = await Supplier.findOne(query)
      .populate('assignedBuyer', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: { supplier }
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching supplier'
    });
  }
});

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private (Admin, Manager)
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  sanitizeInput,
  body('companyInfo.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),
  body('companyInfo.businessType')
    .isIn(['dairy-farm', 'processing-plant', 'distributor', 'manufacturer', 'cooperative', 'other'])
    .withMessage('Invalid business type'),
  body('contactInfo.primaryContact.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Primary contact name is required'),
  body('contactInfo.primaryContact.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid primary contact email'),
  body('contactInfo.primaryContact.phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid primary contact phone number'),
  body('addresses.headquarters.street')
    .notEmpty()
    .withMessage('Headquarters street address is required'),
  body('addresses.headquarters.city')
    .notEmpty()
    .withMessage('Headquarters city is required'),
  body('addresses.headquarters.state')
    .notEmpty()
    .withMessage('Headquarters state is required'),
  body('addresses.headquarters.zipCode')
    .notEmpty()
    .withMessage('Headquarters zip code is required'),
  body('addresses.headquarters.country')
    .notEmpty()
    .withMessage('Headquarters country is required'),
  body('businessDetails.taxId')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tax ID is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    // tenantId is automatically added by autoTenantFilter middleware
    const supplierData = {
      ...req.body,
      createdBy: req.user.id
    };

    const supplier = await Supplier.create(supplierData);

    // Populate the created supplier
    await supplier.populate('assignedBuyer', 'name email');
    await supplier.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: { supplier }
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating supplier'
    });
  }
});

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Manager)
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid supplier ID'),
  sanitizeInput,
  body('companyInfo.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),
  body('contactInfo.primaryContact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid primary contact email'),
  body('contactInfo.primaryContact.phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid primary contact phone number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'blacklisted', 'pending-approval'])
    .withMessage('Invalid supplier status'),
  body('qualityStandards.qualityGrade')
    .optional()
    .isIn(['A+', 'A', 'B+', 'B', 'C'])
    .withMessage('Invalid quality grade'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const supplier = await Supplier.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedBuyer', 'name email')
      .populate('createdBy', 'name email');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: { supplier }
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating supplier'
    });
  }
});

// @desc    Delete supplier (deactivate)
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid supplier ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const supplier = await Supplier.findOne(query);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Deactivate instead of hard delete
    supplier.status = 'inactive';
    await supplier.save();

    res.json({
      success: true,
      message: 'Supplier deactivated successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating supplier'
    });
  }
});

// @desc    Add note to supplier
// @route   POST /api/suppliers/:id/notes
// @access  Private
router.post('/:id/notes', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid supplier ID'),
  sanitizeInput,
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note content must be between 1 and 1000 characters'),
  body('category')
    .optional()
    .isIn(['general', 'quality', 'delivery', 'payment', 'contract'])
    .withMessage('Invalid note category'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { content, category, isPrivate } = req.body;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const supplier = await Supplier.findOne(query);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    await supplier.addNote(content, category || 'general', req.user.id, isPrivate || false);

    await supplier.populate('notes.createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: { supplier }
    });
  } catch (error) {
    console.error('Add supplier note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @desc    Assign supplier to buyer
// @route   PUT /api/suppliers/:id/assign
// @access  Private (Admin, Manager)
router.put('/:id/assign', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid supplier ID'),
  sanitizeInput,
  body('assignedBuyer')
    .isMongoId()
    .withMessage('Invalid buyer ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { assignedBuyer } = req.body;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const supplier = await Supplier.findOneAndUpdate(
      query,
      { assignedBuyer },
      { new: true }
    )
      .populate('assignedBuyer', 'name email');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier assigned successfully',
      data: { supplier }
    });
  } catch (error) {
    console.error('Assign supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning supplier'
    });
  }
}); 

// @desc    Update supplier performance
// @route   PUT /api/suppliers/:id/performance
// @access  Private (Admin, Manager)
router.put('/:id/performance', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid supplier ID'),
  sanitizeInput,
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('qualityScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Quality score must be between 0 and 100'),
  body('onTimeDelivery')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('On-time delivery must be between 0 and 100'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { rating, qualityScore, onTimeDelivery } = req.body;

    const updateData = {};
    if (rating !== undefined) updateData['performance.rating'] = rating;
    if (qualityScore !== undefined) updateData['performance.qualityScore'] = qualityScore;
    if (onTimeDelivery !== undefined) updateData['performance.onTimeDelivery'] = onTimeDelivery;

    // Build query with tenant isolation
    const query = req.user.role !== 'super_admin' 
      ? { _id: req.params.id, tenantId: req.tenant.id }
      : { _id: req.params.id };
    
    const supplier = await Supplier.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier performance updated successfully',
      data: { supplier }
    });
  } catch (error) {
    console.error('Update supplier performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating supplier performance'
    });
  }
});

// @desc    Get supplier statistics
// @route   GET /api/suppliers/stats
// @access  Private (Admin, Manager)
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
], async (req, res) => {
  try {
    // Build match stage with tenant isolation
    const matchStage = req.user.role !== 'super_admin' 
      ? { $match: { tenantId: req.tenant.id } }
      : { $match: {} };
    
    const stats = await Supplier.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          activeSuppliers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pendingApproval: {
            $sum: { $cond: [{ $eq: ['$status', 'pending-approval'] }, 1, 0] }
          },
          averageRating: { $avg: '$performance.rating' },
          averageQualityScore: { $avg: '$performance.qualityScore' },
          totalPurchases: { $sum: '$financialInfo.totalPurchases' }
        }
      }
    ]);

    const businessTypeStats = await Supplier.aggregate([
      matchStage,
      {
        $group: {
          _id: '$companyInfo.businessType',
          count: { $sum: 1 }
        }
      }
    ]);

    const qualityGradeStats = await Supplier.aggregate([
      matchStage,
      {
        $group: {
          _id: '$qualityStandards.qualityGrade',
          count: { $sum: 1 },
          averageRating: { $avg: '$performance.rating' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        supplierStats: stats[0] || {
          totalSuppliers: 0,
          activeSuppliers: 0,
          pendingApproval: 0,
          averageRating: 0,
          averageQualityScore: 0,
          totalPurchases: 0
        },
        businessTypeStats,
        qualityGradeStats
      }
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching supplier statistics'
    });
  }
});

module.exports = router;
