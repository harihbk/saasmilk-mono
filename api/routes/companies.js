const express = require('express');
const { body, param } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { extractTenant, validateTenantAccess } = require('../middleware/tenant');
const { uploadLogo, handleUploadError } = require('../middleware/upload');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SaaS Admin verification middleware
const verifySaasAdmin = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'saas_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SaaS admin privileges required.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const router = express.Router();

// Test route to verify companies route is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Companies route is working!',
    timestamp: new Date().toISOString()
  });
});

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new company with sequential ID
// @route   POST /api/companies/register
// @access  Public
router.post('/register', [
  sanitizeInput,
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('ownerName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Owner name must be between 2 and 50 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyName, email, ownerName, password, phone, businessType, address } = req.body;

    // Debug: Log the received data
    console.log('Registration request body:', {
      companyName,
      email,
      ownerName,
      password: password ? '[PROVIDED]' : '[MISSING]',
      phone,
      businessType,
      address
    });

    // Validate required fields
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Check if company email already exists
    const existingCompany = await Company.findOne({ 'contactInfo.email': email });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'A company with this email already exists'
      });
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Generate sequential tenant ID
    const tenantId = await Company.generateTenantId();

    // Generate slug from company name
    const slug = companyName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    // Create company first (owner field is now optional)
    const company = await Company.create({
      name: companyName,
      slug: slug,
      tenantId: tenantId,
      contactInfo: {
        email: email,
        phone: phone,
        address: address || {}
      },
      businessInfo: {
        type: businessType || 'dairy',
        description: `${companyName} - Registered via SaaS admin`
      },
      subscription: {
        plan: 'trial',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
      }
    });

    // Create owner user with company reference
    const owner = await User.create({
      name: ownerName,
      email: email,
      password: password,
      phone: phone,
      role: 'company_admin',
      isCompanyOwner: true,
      company: company._id,
      tenantId: tenantId,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        products: { create: true, read: true, update: true, delete: true },
        orders: { create: true, read: true, update: true, delete: true },
        customers: { create: true, read: true, update: true, delete: true },
        suppliers: { create: true, read: true, update: true, delete: true },
        inventory: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { create: true, read: true, update: true, delete: true }
      }
    });

    // Update company with owner reference
    company.owner = owner._id;
    await company.save();

    // Update company stats
    await company.updateStats('totalUsers', 1);

    // Generate token for immediate login
    const token = generateToken(owner._id);

    // Update last login
    await owner.updateLastLogin();

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: {
        company: {
          id: company._id,
          name: company.name,
          tenantId: company.tenantId,
          email: company.contactInfo.email,
          plan: company.subscription.plan,
          trialEndsAt: company.subscription.endDate
        },
        user: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
          isCompanyOwner: owner.isCompanyOwner,
          tenantId: owner.tenantId
        },
        token,
        loginInstructions: {
          tenantId: company.tenantId,
          username: owner.email,
          password: 'Use the password you just created',
          loginUrl: '/tenant'
        }
      }
    });

  } catch (error) {
    console.error('Company registration error:', error);
    
    // If there's an error, try to clean up any created records
    if (error.company) {
      try {
        await Company.findByIdAndDelete(error.company);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error during company registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get company by tenant ID
// @route   GET /api/companies/tenant/:tenantId
// @access  Public (for login verification)
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const company = await Company.findOne({ 
      tenantId: tenantId.toUpperCase() 
    }).select('name tenantId isActive isSuspended subscription contactInfo');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found with this tenant ID'
      });
    }

    if (!company.isActive || company.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Company account is inactive or suspended'
      });
    }

    res.json({
      success: true,
      data: {
        company: {
          name: company.name,
          tenantId: company.tenantId,
          isActive: company.isActive,
          subscriptionStatus: company.subscription.status,
          subscriptionPlan: company.subscription.plan
        }
      }
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all companies (SaaS Admin only)
// @route   GET /api/companies
// @access  Private (SaaS Admin)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, plan, status } = req.query;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tenantId: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (plan) query['subscription.plan'] = plan;
    if (status) query['subscription.status'] = status;
    
    const skip = (page - 1) * limit;
    
    const companies = await Company.find(query)
      .populate('owner', 'name email')
      .sort({ tenantId: 1 }) // Sort by tenant ID for sequential display
      .skip(skip)
      .limit(parseInt(limit))
      .select('-notes');
    
    const total = await Company.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies'
    });
  }
});

// @desc    Get next available tenant ID (for preview)
// @route   GET /api/companies/next-tenant-id
// @access  Public
router.get('/next-tenant-id', async (req, res) => {
  try {
    const nextTenantId = await Company.generateTenantId();
    
    res.json({
      success: true,
      data: {
        nextTenantId,
        format: 'Sequential 3-digit format (001, 002, 003, etc.)'
      }
    });
  } catch (error) {
    console.error('Error generating next tenant ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating tenant ID'
    });
  }
});

// @desc    Get company statistics
// @route   GET /api/companies/stats
// @access  Private (SaaS Admin)
router.get('/stats', async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ 
      isActive: true, 
      isSuspended: false 
    });
    const trialCompanies = await Company.countDocuments({ 
      'subscription.plan': 'trial' 
    });
    const paidCompanies = await Company.countDocuments({ 
      'subscription.plan': { $in: ['basic', 'professional', 'enterprise'] }
    });
    const suspendedCompanies = await Company.countDocuments({ 
      isSuspended: true 
    });

    // Get the latest tenant ID to show next available
    const latestCompany = await Company.findOne(
      { tenantId: { $regex: /^[0-9]{3}$/ } },
      { tenantId: 1 },
      { sort: { tenantId: -1 } }
    );

    const nextTenantId = latestCompany ? 
      (parseInt(latestCompany.tenantId) + 1).toString().padStart(3, '0') : 
      '001';

    res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        trialCompanies,
        paidCompanies,
        suspendedCompanies,
        nextTenantId,
        conversionRate: totalCompanies > 0 ? 
          Math.round((paidCompanies / totalCompanies) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid company ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const company = await Company.findOne({ 
      _id: req.params.id, 
      tenantId: req.tenant.id 
    }).select('-notes -subscription.stripeCustomerId -subscription.stripeSubscriptionId');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Debug logging for logo URL
    console.log('Company logo URL:', company.settings?.theme?.logo);

    res.json({
      success: true,
      data: { company }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching company'
    });
  }
});

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid company ID'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('contactInfo.phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('businessInfo.gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please provide a valid GST number (format: 22AAAAA0000A1Z5)'),
  handleValidationErrors
], async (req, res) => {
  try {
    console.log('Backend: Received company update request');
    console.log('Backend: Request body:', JSON.stringify(req.body, null, 2));
    console.log('Backend: Company ID:', req.params.id);
    console.log('Backend: Tenant ID:', req.tenant?.id);

    const allowedFields = [
      'name',
      'contactInfo',
      'businessInfo',
      'settings'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    console.log('Backend: Update data after filtering:', JSON.stringify(updateData, null, 2));

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      updateData,
      { new: true, runValidators: true }
    ).select('-notes -subscription.stripeCustomerId -subscription.stripeSubscriptionId');

    if (!company) {
      console.log('Backend: Company not found with ID:', req.params.id, 'and tenant:', req.tenant?.id);
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    console.log('Backend: Company updated successfully');
    console.log('Backend: Updated company data:', JSON.stringify(company, null, 2));

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating company'
    });
  }
});

// @desc    Upload company logo
// @route   POST /api/companies/:id/logo
// @access  Private
router.post('/:id/logo', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid company ID'),
  uploadLogo,
  handleUploadError,
  handleValidationErrors
], async (req, res) => {
  try {
    const company = await Company.findOne({ 
      _id: req.params.id, 
      tenantId: req.tenant.id 
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }

    // Update logo path in company settings
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/logos/${req.tenant.id}/${req.file.filename}`;
    
    console.log('Generated logo URL:', logoUrl);
    console.log('File info:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    });
    
    company.settings.theme.logo = logoUrl;
    await company.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { 
        company: {
          id: company._id,
          name: company.name,
          logo: company.settings.theme.logo
        }
      }
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading logo'
    });
  }
});

// @desc    Delete company logo
// @route   DELETE /api/companies/:id/logo
// @access  Private
router.delete('/:id/logo', [
  protect,
  extractTenant,
  validateTenantAccess,
  param('id').isMongoId().withMessage('Invalid company ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const company = await Company.findOne({ 
      _id: req.params.id, 
      tenantId: req.tenant.id 
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Remove logo from settings
    company.settings.theme.logo = null;
    await company.save();

    res.json({
      success: true,
      message: 'Logo removed successfully',
      data: { 
        company: {
          id: company._id,
          name: company.name,
          logo: null
        }
      }
    });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing logo'
    });
  }
});

module.exports = router;
