const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee', 'customer'])
    .withMessage('Invalid role'),
  handleValidationErrors
], async (req, res) => {
  try {
  
    const { name, email, password, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      phone
    });

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    await user.updateLastLogin();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscription: user.subscription
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @desc    Login user (supports both email and tenant-based login)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  sanitizeInput,
  body().custom((body) => {
    // Support both email/password and username/password/tenantId
    if (body.tenantId && body.username) {
      // Tenant login validation
      if (!body.username || body.username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }
      if (!body.tenantId || body.tenantId.length < 2) {
        throw new Error('Tenant ID is required for tenant login');
      }
    } else if (body.email) {
      // Email login validation
      if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(body.email)) {
        throw new Error('Please provide a valid email');
      }
    } else {
      throw new Error('Either email or username with tenantId is required');
    }
    
    if (!body.password) {
      throw new Error('Password is required');
    }
    
    return true;
  }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password, username, tenantId } = req.body;
    let user;

    if (tenantId && username) {
      // Tenant-based login
      user = await User.findOne({ 
        $or: [
          { email: username, tenantId: tenantId.toUpperCase() },
          { name: username, tenantId: tenantId.toUpperCase() }
        ]
      }).select('+password').populate('company');
      console.log(1)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or tenant not found'
        });
      }
      console.log(2)

      // Verify user belongs to the tenant
      if (user.tenantId !== tenantId.toUpperCase()) {
        return res.status(401).json({
          success: false,
          message: 'User does not belong to this tenant'
        });
      }
      console.log(3)

      // Check if company is active and not suspended
      if (user.company && (user.company.isSuspended || !user.company.isActive)) {
        return res.status(403).json({
          success: false,
          message: 'Company account is suspended or inactive'
        });
      }
      console.log(4)

    } else if (email) {
      console.log(5)

      // Email-based login (super admin or general login)
      user = await User.findOne({ email }).select('+password').populate('company');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(6)

      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }
    console.log(7)

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    console.log(8)

    // Generate token
    const token = generateToken(user._id);
    console.log(9)

    // Update last login
    await user.updateLastLogin();
    console.log(10)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          company: user.company ? {
            id: user.company._id,
            name: user.company.name,
            tenantId: user.company.tenantId
          } : null,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          company: user.company
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', [
  protect,
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Street address must be between 1 and 100 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', [
  protect,
  sanitizeInput,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
router.post('/refresh', protect, async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

module.exports = router;
