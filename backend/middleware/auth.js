const jwt = require('jsonwebtoken');
const { User } = require('../models/Schemas');

const protect = async (req, res, next) => {
  let token;
  let isAuthorized = false;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_9999');

      // Find user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // Deny access if vendor account status is not active (Suspended, Inactive, Rejected, Pending, isLocked, isActive=false)
      const statusLower = (user.status || '').toLowerCase().trim();
      const userRoleLower = (user.role || user.userType || '').toLowerCase().trim();
      const isVendorRole = userRoleLower.includes('vendor') || userRoleLower.includes('merchant');
      const isNotActive = !['approved', 'active'].includes(statusLower) || user.isActive === false || user.isApproved === false || user.isLocked === true;

      if (isVendorRole && isNotActive) {
        return res.status(403).json({ 
          success: false, 
          isTerminated: true,
          message: `The admin has suspended your account. Please contact administration.` 
        });
      }

      req.user = user;

      // Legacy vendor migration: initialize businesses array if empty
      if (user.role === 'Vendor' && (!user.businesses || user.businesses.length === 0)) {
        const primaryId = user.primaryBusinessId || user._id.toString();
        user.businesses = [{
          _id: primaryId,
          vendorType: user.vendorType || '',
          category: user.category || '',
          subcategory: user.subcategory || '',
          baseVendorType: user.baseVendorType || '',
          businessName: user.businessName || '',
          logo: user.logo || '',
          businessLicense: user.businessLicense || '',
          businessImages: user.businessImages || []
        }];
        user.primaryBusinessId = primaryId;
        await user.save();
      }

      // Handle multi-business session override for Vendor role
      if (user.role === 'Vendor' && user.businesses && user.businesses.length > 0) {
        const activeBusinessId = req.headers['x-business-id'];
        let activeBusiness = null;

        if (activeBusinessId) {
          activeBusiness = user.businesses.find(b => b._id.toString() === activeBusinessId.toString());
        }

        if (!activeBusiness) {
          // fallback to primaryBusinessId or the first business
          const primaryIdStr = user.primaryBusinessId ? user.primaryBusinessId.toString() : '';
          activeBusiness = user.businesses.find(b => b._id.toString() === primaryIdStr) || user.businesses[0];
        }

        if (activeBusiness) {
          // Convert Mongoose document to a plain JavaScript object to bypass _id immutability blocks
          const plainUser = typeof user.toObject === 'function' ? user.toObject() : JSON.parse(JSON.stringify(user));

          // Store parentUserId for profile/account settings updates
          plainUser.parentUserId = user._id.toString();

          // Override properties in-memory
          plainUser._id = activeBusiness._id.toString();
          plainUser.vendorType = activeBusiness.vendorType;
          plainUser.category = activeBusiness.category;
          plainUser.subcategory = activeBusiness.subcategory;
          plainUser.baseVendorType = activeBusiness.baseVendorType;
          plainUser.businessName = activeBusiness.businessName;
          plainUser.logo = activeBusiness.logo;
          plainUser.businessLicense = activeBusiness.businessLicense;

          req.user = plainUser;
        }
      }

      isAuthorized = true;
    } catch (error) {
      console.error('Auth token error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  if (isAuthorized) {
    next();
  }
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role (${req.user ? req.user.role : 'Guest'}) is not authorized to access this resource` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
