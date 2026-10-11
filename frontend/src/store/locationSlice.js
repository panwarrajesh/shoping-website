import { createSlice } from '@reduxjs/toolkit';

const KEY = 'lm_location';
const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && typeof v === 'object' && v.label ? v : null;
  } catch { return null; }
};
export const LOCATION_STORAGE_KEY = KEY;

// current: { label, city?, area?, state?, pincode?, latitude?, longitude?, locationId?, source: 'manual' | 'gps' | 'saved' }
const slice = createSlice({
  name: 'location',
  initialState: { current: load(), sheetOpen: false },
  reducers: {
    setLocation: (s, { payload }) => { s.current = payload; },
    clearLocation: (s) => { s.current = null; },
    openSheet: (s) => { s.sheetOpen = true; },
    closeSheet: (s) => { s.sheetOpen = false; },
  },
});

export const { setLocation, clearLocation, openSheet, closeSheet } = slice.actions;
export default slice.reducer;
