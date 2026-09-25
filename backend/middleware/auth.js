const mongoose = require('mongoose');
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

      // Find user from database (supporting both String and ObjectId _id, with email fallback)
      let user = null;
      if (decoded.id) {
        user = await User.findById(decoded.id);
        if (!user && mongoose.Types.ObjectId.isValid(decoded.id)) {
          user = await User.findById(new mongoose.Types.ObjectId(decoded.id));
        }
      }
      if (!user && decoded.email) {
        user = await User.findOne({ email: String(decoded.email).toLowerCase().trim() });
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // Deny access if vendor account status is not active (Suspended, Inactive, Rejected, Pending, isLocked, isActive=false)
      const statusLower = (user.status || '').toLowerCase().trim();
      const userRoleLower = (user.role || user.userType || '').toLowerCase().trim();
      const isVendorRole = userRoleLower.includes('vendor') || userRoleLower.includes('merchant');
      const isApprovedStatus = ['approved', 'active', 'assigned'].includes(statusLower);
      const isNotActive = !isApprovedStatus || ['pending', 'suspended', 'inactive', 'rejected'].includes(statusLower) || user.isActive === false || user.isApproved === false || user.isLocked === true;

      if (isVendorRole && isNotActive) {
        if (statusLower === 'pending') {
          return res.status(403).json({
            success: false,
            message: 'Your account is pending approval by the Admin. Please try again later.'
          });
        }
        return res.status(403).json({ 
          success: false, 
          isTerminated: true,
          message: 'Your vendor account has been suspended. Please contact the administrator.' 
        });
      }

      req.user = user;
      if (!req.user.parentUserId) {
        req.user.parentUserId = user._id ? user._id.toString() : '';
      }

      // Legacy vendor migration: initialize businesses array if empty
      if (isVendorRole && (!user.businesses || user.businesses.length === 0)) {
        const primaryId = user.primaryBusinessId || (user._id ? user._id.toString() : '');
        const computedBaseType = user.baseVendorType || (user.vendorType ? (user.vendorType.includes(':') ? user.vendorType.split(':')[0].trim() : user.vendorType) : 'Store Vendor');
        user.businesses = [{
          _id: primaryId,
          vendorType: user.vendorType || 'Products',
          category: user.category || 'Products',
          subcategory: user.subcategory || 'Products',
          baseVendorType: computedBaseType,
          businessName: user.businessName || user.name || 'Vendor Store',
          logo: user.logo || '',
          businessLicense: user.businessLicense || '',
          businessImages: user.businessImages || []
        }];
        user.primaryBusinessId = primaryId;
        await user.save().catch(() => {});
      }

      // Handle multi-business session override for Vendor role
      if (isVendorRole && user.businesses && user.businesses.length > 0) {
        const activeBusinessId = req.headers['x-business-id'];
        let activeBusiness = null;

        if (activeBusinessId) {
          const searchKey = String(activeBusinessId).trim().toLowerCase();
          activeBusiness = user.businesses.find(b => b && (
            (b._id && String(b._id).toLowerCase() === searchKey) ||
            (b.id && String(b.id).toLowerCase() === searchKey) ||
            (b.category && String(b.category).toLowerCase() === searchKey) ||
            (b.vendorType && String(b.vendorType).toLowerCase() === searchKey)
          ));
          if (activeBusiness) {
            const bStatus = (activeBusiness.status || '').toLowerCase().trim();
            const isApprovedOrActive = ['active', 'approved'].includes(bStatus) || activeBusiness.isActive === true;
            if (!isApprovedOrActive && (['pending', 'pending approval', 'pending_approval', 'under_verification', 'suspended', 'rejected'].includes(bStatus) || activeBusiness.isActive === false)) {
              return res.status(403).json({
                success: false,
                isPendingApproval: true,
                message: 'Access denied: Selected business outlet request is pending Admin approval or suspended.'
              });
            }
          }
        }

        if (!activeBusiness) {
          // fallback to primaryBusinessId or the first active business
          const primaryIdStr = user.primaryBusinessId ? String(user.primaryBusinessId).toLowerCase() : '';
          activeBusiness = user.businesses.find(b => {
            if (!b) return false;
            const bStatus = (b.status || '').toLowerCase().trim();
            const isOk = ['active', 'approved'].includes(bStatus) || b.isActive === true;
            return (b._id && String(b._id).toLowerCase() === primaryIdStr) && isOk;
          }) || user.businesses.find(b => {
            if (!b) return false;
            const bStatus = (b.status || '').toLowerCase().trim();
            return (bStatus === 'active' || bStatus === 'approved') || b.isActive === true;
          }) || user.businesses[0];
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
