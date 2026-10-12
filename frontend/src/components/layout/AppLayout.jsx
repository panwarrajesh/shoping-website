import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNavigation from './BottomNavigation';

export default function AppLayout() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-4"><Outlet /></main>
      <BottomNavigation />
    </div>
  );
}
