import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { customerService } from '../services/customerService';
import { clearUser } from './authSlice';

export const loadWishlistIds = createAsyncThunk('wishlist/load', async () => (await customerService.wishlistIds()).ids);

// Heart turns red instantly; if the server fails we roll it back.
export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (productId, { getState, dispatch, rejectWithValue }) => {
  const had = getState().wishlist.ids.includes(productId);
  dispatch(slice.actions.set({ productId, on: !had }));
  try {
    if (had) await customerService.removeFromWishlist(productId); else await customerService.addToWishlist(productId);
    return !had;
  } catch (e) {
    dispatch(slice.actions.set({ productId, on: had }));
    return rejectWithValue(e.message);
  }
});

const slice = createSlice({
  name: 'wishlist',
  initialState: { ids: [] },
  reducers: {
    set: (s, { payload: { productId, on } }) => {
      s.ids = on ? [...new Set([...s.ids, productId])] : s.ids.filter((x) => x !== productId);
    },
  },
  extraReducers: (b) => {
    b.addCase(loadWishlistIds.fulfilled, (s, { payload }) => { s.ids = payload; });
    b.addCase(clearUser, (s) => { s.ids = []; });
  },
});

export default slice.reducer;
