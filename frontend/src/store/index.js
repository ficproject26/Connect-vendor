import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import vendorReducer from './vendorSlice';
import dashboardReducer from './dashboardSlice';
import productReducer from './productSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vendor: vendorReducer,
    dashboard: dashboardReducer,
    product: productReducer,
    ui: uiReducer
  }
});
