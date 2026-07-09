import { createSlice } from '@reduxjs/toolkit';

let user = null;
let token = null;
let card = null;

try {
  const savedUser = localStorage.getItem('vendor_user');
  user = savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
} catch (e) {
  console.error("Failed to parse user from localStorage", e);
}

try {
  token = localStorage.getItem('vendor_token') || null;
} catch (e) {
  console.error("Failed to get token from localStorage", e);
}

try {
  const savedCard = localStorage.getItem('vendor_card');
  card = savedCard && savedCard !== 'undefined' ? JSON.parse(savedCard) : null;
} catch (e) {
  console.error("Failed to parse card from localStorage", e);
}

let activeBusinessId = null;
try {
  activeBusinessId = localStorage.getItem('active_business_id') || null;
} catch (e) {
  console.error("Failed to get active_business_id", e);
}

// Override user properties on initial load if they are a Vendor
if (user && user.role === 'Vendor' && user.businesses && user.businesses.length > 0) {
  const activeId = activeBusinessId || user.primaryBusinessId || user.businesses[0]._id;
  const activeBiz = user.businesses.find(b => b._id === activeId) || user.businesses[0];
  if (activeBiz) {
    activeBusinessId = activeBiz._id;
    user.vendorType = activeBiz.vendorType;
    user.category = activeBiz.category;
    user.subcategory = activeBiz.subcategory;
    user.baseVendorType = activeBiz.baseVendorType;
    user.businessName = activeBiz.businessName;
    user.logo = activeBiz.logo;
    user.businessLicense = activeBiz.businessLicense;
    user.businessImages = activeBiz.businessImages;
  }
}

const savedSidebar = localStorage.getItem('sidebar_collapsed');
const sidebarCollapsed = savedSidebar === null ? true : savedSidebar === 'true';

const initialState = {
  user,
  token,
  card,
  isAuthenticated: !!token,
  loading: false,
  error: null,
  sidebarCollapsed,
  activeBusinessId
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.card = action.payload.card || null;
      state.error = null;

      let payloadUser = action.payload.user;
      if (payloadUser && payloadUser.role === 'Vendor' && payloadUser.businesses && payloadUser.businesses.length > 0) {
        const activeId = payloadUser.primaryBusinessId || payloadUser.businesses[0]._id;
        const activeBiz = payloadUser.businesses.find(b => b._id === activeId) || payloadUser.businesses[0];
        if (activeBiz) {
          state.activeBusinessId = activeBiz._id;
          localStorage.setItem('active_business_id', activeBiz._id);

          // Merge fields to root user object
          payloadUser.vendorType = activeBiz.vendorType;
          payloadUser.category = activeBiz.category;
          payloadUser.subcategory = activeBiz.subcategory;
          payloadUser.baseVendorType = activeBiz.baseVendorType;
          payloadUser.businessName = activeBiz.businessName;
          payloadUser.logo = activeBiz.logo;
          payloadUser.businessLicense = activeBiz.businessLicense;
          payloadUser.businessImages = activeBiz.businessImages;
        }
      } else {
        state.activeBusinessId = null;
        localStorage.removeItem('active_business_id');
      }

      state.user = payloadUser;

      // Save to localStorage
      localStorage.setItem('vendor_user', JSON.stringify(payloadUser));
      localStorage.setItem('vendor_token', action.payload.token);
      if (action.payload.card) {
        localStorage.setItem('vendor_card', JSON.stringify(action.payload.card));
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.card = null;
      state.error = action.payload;
      state.activeBusinessId = null;
      localStorage.removeItem('active_business_id');
    },
    updateCard: (state, action) => {
      state.card = action.payload;
      localStorage.setItem('vendor_card', JSON.stringify(action.payload));
    },
    updateUser: (state, action) => {
      let payloadUser = { ...state.user, ...action.payload };
      if (payloadUser && payloadUser.role === 'Vendor' && payloadUser.businesses && payloadUser.businesses.length > 0) {
        const activeId = state.activeBusinessId || payloadUser.primaryBusinessId || payloadUser.businesses[0]._id;
        const activeBiz = payloadUser.businesses.find(b => b._id === activeId) || payloadUser.businesses[0];
        if (activeBiz) {
          state.activeBusinessId = activeBiz._id;
          localStorage.setItem('active_business_id', activeBiz._id);

          payloadUser.vendorType = activeBiz.vendorType;
          payloadUser.category = activeBiz.category;
          payloadUser.subcategory = activeBiz.subcategory;
          payloadUser.baseVendorType = activeBiz.baseVendorType;
          payloadUser.businessName = activeBiz.businessName;
          payloadUser.logo = activeBiz.logo;
          payloadUser.businessLicense = activeBiz.businessLicense;
          payloadUser.businessImages = activeBiz.businessImages;
        }
      }
      state.user = payloadUser;
      localStorage.setItem('vendor_user', JSON.stringify(payloadUser));
    },
    switchBusinessSuccess: (state, action) => {
      const activeId = action.payload;
      state.activeBusinessId = activeId;
      localStorage.setItem('active_business_id', activeId);

      if (state.user && state.user.role === 'Vendor' && state.user.businesses) {
        const activeBiz = state.user.businesses.find(b => b._id === activeId);
        if (activeBiz) {
          state.user.vendorType = activeBiz.vendorType;
          state.user.category = activeBiz.category;
          state.user.subcategory = activeBiz.subcategory;
          state.user.baseVendorType = activeBiz.baseVendorType;
          state.user.businessName = activeBiz.businessName;
          state.user.logo = activeBiz.logo;
          state.user.businessLicense = activeBiz.businessLicense;
          state.user.businessImages = activeBiz.businessImages;
          localStorage.setItem('vendor_user', JSON.stringify(state.user));
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.card = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.activeBusinessId = null;

      // Remove from localStorage
      localStorage.removeItem('vendor_user');
      localStorage.removeItem('vendor_token');
      localStorage.removeItem('vendor_card');
      localStorage.removeItem('active_business_id');
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebar_collapsed', state.sidebarCollapsed);
    }
  }
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  updateCard, 
  updateUser,
  switchBusinessSuccess,
  logout, 
  clearError,
  toggleSidebar
} = authSlice.actions;

export default authSlice.reducer;
