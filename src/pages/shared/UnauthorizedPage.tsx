import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl border border-slate-200">
        <h1 className="text-6xl font-bold text-red-600">403</h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-800">
          Unauthorized Access
        </h2>
        <p className="mt-3 text-slate-600">
          You do not have permission to access this module or view this resource.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
