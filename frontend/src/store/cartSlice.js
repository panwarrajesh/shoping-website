import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '../services/cartService';
import { clearUser } from './authSlice';
import { locationParams } from '../utils/location';

// Logged-in customers: cart lives on the server.
// Guests: cart lives on this device ([{ variantId, quantity }]); the server only prices it ("preview") and merges it after login.
const KEY = 'lm_guest_cart';
const MAX_QTY = 10;
const MAX_LINES = 30;

const readGuest = () => {
  try {
    const a = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(a) ? a.filter((x) => x && typeof x.variantId === 'string' && Number.isInteger(x.quantity) && x.quantity > 0) : [];
  } catch { return []; }
};
const writeGuest = (items) => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ } };
const guestCount = () => readGuest().reduce((t, i) => t + i.quantity, 0);

export const EMPTY_CART = { groups: [], totals: { itemsTotal: 0, mrpTotal: 0, savings: 0, deliveryTotal: 0, grandTotal: 0 }, count: 0, lines: 0, canCheckout: false };

const ctx = (getState) => { const s = getState(); return { user: s.auth.user, lp: locationParams(s.location.current) }; };
const guestView = async (lp) => { const items = readGuest(); return items.length ? (await cartService.preview(items, lp)).cart : EMPTY_CART; };

const BLOCKING = {
  UNAVAILABLE: 'Yeh product ab available nahi hai',
  OUT_OF_STOCK: 'Yeh abhi stock mein nahi hai',
  NOT_DELIVERABLE: 'Yeh seller aapke area mein delivery nahi karta',
  OWN_PRODUCT: 'Aap apna hi product nahi khareed sakte',
};

export const loadCart = createAsyncThunk('cart/load', async (_, { getState, rejectWithValue }) => {
  const { user, lp } = ctx(getState);
  try { return { cart: user ? (await cartService.get(lp)).cart : await guestView(lp) }; } catch (e) { return rejectWithValue(e.message); }
});

export const addItem = createAsyncThunk('cart/add', async ({ variantId, quantity = 1 }, { getState, rejectWithValue }) => {
  const { user, lp } = ctx(getState);
  try {
    if (user) { const d = await cartService.add({ variantId, quantity }, lp); return { cart: d.cart, notice: d.notice }; }

    const items = readGuest();
    const ex = items.find((i) => i.variantId === variantId);
    if (!ex && items.length >= MAX_LINES) return rejectWithValue(`Cart mein maximum ${MAX_LINES} alag products ho sakte hain`);
    if (ex && ex.quantity >= MAX_QTY) return rejectWithValue(`Ek product ke maximum ${MAX_QTY} piece le sakte ho`);
    let next = ex ? items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i)) : [...items, { variantId, quantity: Math.min(MAX_QTY, quantity) }];

    let cart = (await cartService.preview(next, lp)).cart;
    const find = (c) => c.groups.flatMap((g) => g.items).find((i) => i.variantId === variantId);
    const bad = find(cart)?.issues.find((x) => BLOCKING[x.code]);
    if (bad) return rejectWithValue(BLOCKING[bad.code]);

    let notice = null;
    const low = find(cart)?.issues.find((x) => x.code === 'LOW_STOCK');
    if (low) {
      if (ex && ex.quantity >= low.availableQty) return rejectWithValue(`Sirf ${low.availableQty} piece bache hain aur woh aapke cart mein hain`);
      next = next.map((i) => (i.variantId === variantId ? { ...i, quantity: low.availableQty } : i));
      cart = (await cartService.preview(next, lp)).cart;
      notice = `Sirf ${low.availableQty} piece add ho paye (stock limit)`;
    }
    writeGuest(next);
    return { cart, notice };
  } catch (e) { return rejectWithValue(e.message); }
});

export const setQty = createAsyncThunk('cart/setQty', async ({ lineId, quantity }, { getState, rejectWithValue }) => {
  const { user, lp } = ctx(getState);
  try {
    if (user) return { cart: (await cartService.setQty(lineId, quantity, lp)).cart };
    writeGuest(readGuest().map((i) => (i.variantId === lineId ? { ...i, quantity } : i)));
    return { cart: await guestView(lp) };
  } catch (e) { return rejectWithValue(e.message); }
});

export const removeLine = createAsyncThunk('cart/remove', async (lineId, { getState, rejectWithValue }) => {
  const { user, lp } = ctx(getState);
  try {
    if (user) return { cart: (await cartService.remove(lineId, lp)).cart };
    writeGuest(readGuest().filter((i) => i.variantId !== lineId));
    return { cart: await guestView(lp) };
  } catch (e) { return rejectWithValue(e.message); }
});

// After login: move the device cart into the account cart (nothing is lost if this fails)
export const mergeGuest = createAsyncThunk('cart/merge', async (_, { getState, rejectWithValue }) => {
  const items = readGuest();
  if (!items.length) return null;
  try {
    const d = await cartService.merge(items, ctx(getState).lp);
    writeGuest([]);
    return { cart: d.cart };
  } catch (e) { return rejectWithValue(e.message); }
});

const slice = createSlice({
  name: 'cart',
  initialState: { view: null, count: guestCount() },
  reducers: {},
  extraReducers: (b) => {
    const take = (s, { payload }) => { if (payload?.cart) { s.view = payload.cart; s.count = payload.cart.count; } };
    [loadCart, addItem, setQty, removeLine, mergeGuest].forEach((t) => b.addCase(t.fulfilled, take));
    b.addCase(clearUser, (s) => { s.view = null; s.count = guestCount(); });
  },
});

export default slice.reducer;
