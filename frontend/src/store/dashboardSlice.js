import { createSlice } from '@reduxjs/toolkit';
export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { stats: null },
  reducers: { setStats: (state, action) => { state.stats = action.payload; } }
});
export const { setStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;
