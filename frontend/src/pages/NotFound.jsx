import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-extrabold text-brand-600">404</p>
      <p className="mt-2 text-ink-soft">Yeh page nahi mila.</p>
      <Link to="/"><Button className="mt-6">Home par jao</Button></Link>
    </div>
  );
}
