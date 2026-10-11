import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import wishlistReducer from './wishlistSlice';
import locationReducer, { LOCATION_STORAGE_KEY } from './locationSlice';

export const store = configureStore({ reducer: { auth: authReducer, wishlist: wishlistReducer, location: locationReducer } });

// Remember the chosen area on this device (a preference, not sensitive data)
let last = store.getState().location.current;
store.subscribe(() => {
  const cur = store.getState().location.current;
  if (cur === last) return;
  last = cur;
  try {
    if (cur) localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(cur)); else localStorage.removeItem(LOCATION_STORAGE_KEY);
  } catch { /* private mode: ignore */ }
});
