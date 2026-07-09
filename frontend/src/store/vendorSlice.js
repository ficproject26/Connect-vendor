import { createSlice } from '@reduxjs/toolkit';
export const vendorSlice = createSlice({
  name: 'vendor',
  initialState: { data: null },
  reducers: { setVendorData: (state, action) => { state.data = action.payload; } }
});
export const { setVendorData } = vendorSlice.actions;
export default vendorSlice.reducer;
