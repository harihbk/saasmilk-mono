const express = require('express');
const { body, param } = require('express-validator');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess } = require('../middleware/tenant');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation');

const router = express.Router();

// @desc    Get company settings for current tenant
// @route   GET /api/company-settings
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess
], async (req, res) => {
  try {
    const company = await Company.findOne({ tenantId: req.tenant.id })
      .select('-notes -subscription.stripeCustomerId -subscription.stripeSubscriptionId');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: { company }
    });
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching company settings'
    });
  }
});

// @desc    Update company settings
// @route   PUT /api/company-settings
// @access  Private (Admin, Manager)
router.put('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  sanitizeInput,
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('address.street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.zipCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Zip code is required'),
  body('businessDetails.gstNumber')
    .optional()
    .trim(),
  body('businessDetails.panNumber')
    .optional()
    .trim(),
  body('businessDetails.licenseNumber')
    .optional()
    .trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    // Only allow certain fields to be updated
    const allowedFields = [
      'companyName',
      'email',
      'phone',
      'address',
      'businessDetails',
      'logo',
      'website',
      'description'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const company = await Company.findOneAndUpdate(
      { tenantId: req.tenant.id },
      updateData,
      { new: true, runValidators: true }
    ).select('-notes -subscription.stripeCustomerId -subscription.stripeSubscriptionId');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating company settings'
    });
  }
});

// @desc    Update company logo
// @route   PUT /api/company-settings/logo
// @access  Private (Admin, Manager)
router.put('/logo', [
  protect,
  extractTenant,
  validateTenantAccess,
  sanitizeInput,
  body('logo')
    .notEmpty()
    .withMessage('Logo URL is required')
    .isURL()
    .withMessage('Please provide a valid URL'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { logo } = req.body;

    const company = await Company.findOneAndUpdate(
      { tenantId: req.tenant.id },
      { logo },
      { new: true, runValidators: true }
    ).select('companyName logo');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company logo updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update company logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating company logo'
    });
  }
});

// @desc    Update company business details
// @route   PUT /api/company-settings/business-details
// @access  Private (Admin)
router.put('/business-details', [
  protect,
  extractTenant,
  validateTenantAccess,
  sanitizeInput,
  body('businessDetails.taxId')
    .optional()
    .trim(),
  body('businessDetails.gstNumber')
    .optional()
    .trim(),
  body('businessDetails.panNumber')
    .optional()
    .trim(),
  body('businessDetails.licenseNumber')
    .optional()
    .trim(),
  body('businessDetails.bankDetails.accountName')
    .optional()
    .trim(),
  body('businessDetails.bankDetails.accountNumber')
    .optional()
    .trim(),
  body('businessDetails.bankDetails.bankName')
    .optional()
    .trim(),
  body('businessDetails.bankDetails.ifscCode')
    .optional()
    .trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { businessDetails } = req.body;

    const company = await Company.findOneAndUpdate(
      { tenantId: req.tenant.id },
      { businessDetails },
      { new: true, runValidators: true }
    ).select('companyName businessDetails');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Business details updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update business details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating business details'
    });
  }
});

// @desc    Get company subscription details
// @route   GET /api/company-settings/subscription
// @access  Private
router.get('/subscription', [
  protect,
  extractTenant,
  validateTenantAccess
], async (req, res) => {
  try {
    const company = await Company.findOne({ tenantId: req.tenant.id })
      .select('companyName subscription');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Calculate days remaining
    const daysRemaining = company.subscription.endDate 
      ? Math.ceil((company.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      success: true,
      data: {
        company: {
          companyName: company.companyName,
          subscription: {
            ...company.subscription.toObject(),
            daysRemaining,
            isActive: company.isSubscriptionActive()
          }
        }
      }
    });
  } catch (error) {
    console.error('Get subscription details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subscription details'
    });
  }
});

module.exports = router;