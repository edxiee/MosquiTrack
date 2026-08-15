import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4 px-4 text-center">
      <h1 className="text-7xl font-bold text-slate-900">404</h1>
      <p className="text-xl font-medium text-slate-700">Page not found</p>
      <p className="max-w-md text-sm text-slate-500">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
        <Link to="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
