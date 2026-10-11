import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { locationService } from '../../services/locationService';
import { setLocation } from '../../store/locationSlice';

// Logged-in customers: the chosen area follows them to another phone/browser.
export default function LocationSync() {
  const userId = useSelector((s) => s.auth.user?.id);
  const current = useSelector((s) => s.location.current);
  const dispatch = useDispatch();

  // No area on this device yet -> use the one saved on the account
  useEffect(() => {
    if (!userId || current) return undefined;
    let alive = true;
    locationService.mine().then(({ location: l }) => {
      if (alive && l) dispatch(setLocation({ locationId: l.id, label: l.label, city: l.city, area: l.area, state: l.state, pincode: l.pincode, latitude: l.latitude, longitude: l.longitude, source: 'saved' }));
    }).catch(() => {});
    return () => { alive = false; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember a manually chosen area on the account (GPS points are never saved)
  useEffect(() => {
    if (userId && current?.locationId && current.source !== 'gps') locationService.saveMine(current.locationId).catch(() => {});
  }, [userId, current?.locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
