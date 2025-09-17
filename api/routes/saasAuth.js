const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// SaaS Admin Login - Separate from tenant authentication
router.post('/saas-admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;


    // SaaS admin credentials from environment or defaults for development
    const SAAS_ADMIN_EMAIL = process.env.SAAS_ADMIN_EMAIL || 'admin@admin.com';
    const SAAS_ADMIN_PASSWORD = process.env.SAAS_ADMIN_PASSWORD || 'Hari@123';

    // Validate credentials
    if (email !== SAAS_ADMIN_EMAIL) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      }); 
    }

    // Check password (in production, this should  be hashed)
    let isPasswordValid = false;
    
    if (process.env.SAAS_ADMIN_PASSWORD_HASH) {
      // Use hashed password if available
      isPasswordValid = await bcrypt.compare(password, process.env.SAAS_ADMIN_PASSWORD_HASH);
    } else {
      // Fallback to plain text for development (NOT recommended for production)
      isPasswordValid = password === SAAS_ADMIN_PASSWORD;
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Generate JWT token for SaaS admin
    const token = jwt.sign(
      {
        id: 'saas-admin',
        email: SAAS_ADMIN_EMAIL,
        role: 'saas_admin',
        type: 'saas_admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'SaaS Admin login successful',
      token,
      user: {
        id: 'saas-admin',
        email: SAAS_ADMIN_EMAIL,
        name: 'SaaS Administrator',
        role: 'saas_admin',
        type: 'saas_admin'
      }
    });

  } catch (error) {
    console.error('SaaS admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

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

// SaaS Admin protected route example
router.get('/saas-admin/profile', verifySaasAdmin, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// SaaS Admin dashboard stats
router.get('/saas-admin/stats', verifySaasAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const User = require('../models/User');
    
    // Fetch real stats from database
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true, isSuspended: false });
    const suspendedCompanies = await Company.countDocuments({ isSuspended: true });
    const trialCompanies = await Company.countDocuments({ 'subscription.plan': 'trial' });
    
    const totalUsers = await User.countDocuments({ role: { $ne: 'super_admin' } });
    const activeUsers = await User.countDocuments({ isActive: true, role: { $ne: 'super_admin' } });
    
    const stats = {
      summary: {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        trialCompanies,
        recentCompanies: await Company.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      },
      users: {
        totalUsers,
        activeUsers
      },
      revenue: {
        totalRevenue: 125000, // This would come from billing system
        monthlyRevenue: 15000
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching SaaS admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats'
    });
  }
});

// SaaS Admin - Get all companies (for tenant management)
router.get('/saas-admin/companies', verifySaasAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
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
      .sort({ createdAt: -1 })
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

// SaaS Admin - Suspend/Unsuspend company
router.patch('/saas-admin/companies/:id/suspend', verifySaasAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const { suspend, reason } = req.body;
    
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    company.isSuspended = suspend;
    if (suspend && reason) {
      company.suspensionReason = reason;
      company.suspendedAt = new Date();
    } else if (!suspend) {
      company.suspensionReason = undefined;
      company.suspendedAt = undefined;
    }
    
    await company.save();
    
    res.json({
      success: true,
      message: `Company ${suspend ? 'suspended' : 'unsuspended'} successfully`,
      data: { company }
    });
  } catch (error) {
    console.error('Error updating company status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating company status'
    });
  }
});

module.exports = router;
