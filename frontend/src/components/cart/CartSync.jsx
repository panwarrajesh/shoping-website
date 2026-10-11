import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadCart, mergeGuest } from '../../store/cartSlice';

// Keeps the cart badge right: on app start, on login (merging the device cart first) and on logout.
export default function CartSync() {
  const userId = useSelector((s) => s.auth.user?.id);
  const ready = useSelector((s) => s.auth.bootstrapped);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (userId) await dispatch(mergeGuest());
      dispatch(loadCart());
    })();
  }, [userId, ready, dispatch]);

  return null;
}
