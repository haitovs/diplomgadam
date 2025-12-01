import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-semibold text-slate-900">404</h1>
      <p className="text-slate-500">The page you requested does not exist.</p>
      <Link to="/" className="text-brand-600 underline">
        Return home
      </Link>
    </div>
  );
}
