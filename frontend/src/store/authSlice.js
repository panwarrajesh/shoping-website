import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setAccessToken, refreshSession } from '../services/api';
import { authService } from '../services/authService';

// On page load: try to restore the session from the httpOnly refresh cookie
export const bootstrap = createAsyncThunk('auth/bootstrap', async () => {
  const d = await refreshSession();
  return d.user;
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, bootstrapped: false },
  reducers: {
    setUser: (s, { payload }) => { s.user = payload; },
    clearUser: (s) => { s.user = null; },
  },
  extraReducers: (b) => {
    b.addCase(bootstrap.fulfilled, (s, { payload }) => { s.user = payload; s.bootstrapped = true; });
    b.addCase(bootstrap.rejected, (s) => { s.user = null; s.bootstrapped = true; });
  },
});

export const { setUser, clearUser } = slice.actions;

export const startSession = ({ user, accessToken }) => (dispatch) => {
  setAccessToken(accessToken);
  dispatch(setUser(user));
};
export const endSession = () => (dispatch) => {
  setAccessToken(null);
  dispatch(clearUser());
};
export const logout = () => async (dispatch) => {
  try { await authService.logout(); } catch { /* cookie is cleared by server when possible */ }
  dispatch(endSession());
};

export default slice.reducer;
