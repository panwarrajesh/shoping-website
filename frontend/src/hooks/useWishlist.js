import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { toggleWishlist } from '../store/wishlistSlice';
import { useToast } from '../components/ui/Toast';

export default function useWishlist() {
  const ids = useSelector((s) => s.wishlist.ids);
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const has = useCallback((id) => ids.includes(id), [ids]);
  const toggle = useCallback(async (p) => {
    if (!user) { toast.error('Wishlist ke liye pehle login karo'); navigate('/login', { state: { from: location } }); return; }
    const r = await dispatch(toggleWishlist(p.id || p));
    if (toggleWishlist.rejected.match(r)) toast.error(r.payload || 'Kuch gadbad ho gayi');
  }, [user, dispatch, navigate, location, toast]);

  return { has, toggle };
}
