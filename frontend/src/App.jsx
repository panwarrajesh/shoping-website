import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from './components/layout/AppLayout';
import SellerLayout from './components/layout/SellerLayout';
import { ProtectedRoute, GuestRoute } from './components/layout/RouteGuards';
import Home from './pages/Home';
import Categories from './pages/Categories';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import Addresses from './pages/Addresses';
import Wishlist from './pages/Wishlist';
import Notifications from './pages/Notifications';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import SellerLanding from './pages/seller/SellerLanding';
import SellerRegister from './pages/seller/SellerRegister';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProfile from './pages/seller/SellerProfile';
import SellerSettings from './pages/seller/SellerSettings';
import SellerProducts from './pages/seller/SellerProducts';
import SellerProductForm from './pages/seller/SellerProductForm';
import SellerInventory from './pages/seller/SellerInventory';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import { bootstrap } from './store/authSlice';
import { loadWishlistIds } from './store/wishlistSlice';
import LocationSheet from './components/location/LocationSheet';
import LocationSync from './components/location/LocationSync';
import CartSync from './components/cart/CartSync';
import CartPage from './pages/Cart';

const soon = (title) => <ComingSoon title={title} to="/seller/dashboard" cta="Dashboard par jao" />;

export default function App() {
  const dispatch = useDispatch();
  const userId = useSelector((s) => s.auth.user?.id);
  useEffect(() => { dispatch(bootstrap()); }, [dispatch]);
  useEffect(() => { if (userId) dispatch(loadWishlistIds()); }, [userId, dispatch]);

  return (
    <BrowserRouter>
      <LocationSync />
      <CartSync />
      <LocationSheet />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Seller registration is a focused full-screen flow */}
        <Route element={<ProtectedRoute />}>
          <Route path="/seller/register" element={<SellerRegister />} />
        </Route>

        {/* Seller panel: sidebar on desktop, bottom navigation on phones */}
        <Route element={<ProtectedRoute roles={['SELLER']} roleRedirect="/seller" />}>
          <Route element={<SellerLayout />}>
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/profile" element={<SellerProfile />} />
            <Route path="/seller/settings" element={<SellerSettings />} />
            <Route path="/seller/products" element={<SellerProducts />} />
            <Route path="/seller/products/add" element={<SellerProductForm />} />
            <Route path="/seller/products/:id/edit" element={<SellerProductForm />} />
            <Route path="/seller/orders" element={soon('Orders jaldi aa rahe hain')} />
            <Route path="/seller/inventory" element={<SellerInventory />} />
            <Route path="/seller/earnings" element={soon('Earnings jaldi aa rahe hain')} />
            <Route path="/seller/returns" element={soon('Returns jaldi aa rahe hain')} />
            <Route path="/seller/reviews" element={soon('Reviews jaldi aa rahe hain')} />
          </Route>
        </Route>

        {/* Product page has its own header and sticky Buy bar */}
        <Route path="/products/:id" element={<ProductDetail />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/seller" element={<SellerLanding />} />

          {/* Built in later steps: shown as "coming soon" instead of a broken page */}
          <Route path="/search" element={<ProductList />} />
          <Route path="/category/:slug" element={<ProductList />} />
          <Route path="/cart" element={<CartPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/checkout" element={<ComingSoon title="Checkout jaldi aa raha hai" to="/cart" cta="Cart par jao" />} />
            <Route path="/orders" element={<ComingSoon title="Orders jaldi aa rahe hain" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/profile/password" element={<ChangePassword />} />
            <Route path="/addresses" element={<Addresses />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
