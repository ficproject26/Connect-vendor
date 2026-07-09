import { createSlice } from '@reduxjs/toolkit';
export const productSlice = createSlice({
  name: 'product',
  initialState: { list: [] },
  reducers: { setProducts: (state, action) => { state.list = action.payload; } }
});
export const { setProducts } = productSlice.actions;
export default productSlice.reducer;
