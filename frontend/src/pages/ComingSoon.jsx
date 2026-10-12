import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function ComingSoon({ title = 'Jaldi aa raha hai', to = '/', cta = 'Home par jao' }) {
  return (
    <div className="rounded-card bg-white shadow-card">
      <EmptyState icon={Hammer} title={title} text="Yeh feature abhi ban raha hai." action={<Link to={to}><Button>{cta}</Button></Link>} />
    </div>
  );
}
