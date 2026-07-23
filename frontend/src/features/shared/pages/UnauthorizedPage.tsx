import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-6xl font-bold text-red-600">
          403
        </h1>

        <h2 className="mt-4 text-2xl font-semibold text-slate-800">
          Unauthorized
        </h2>

        <p className="mt-3 text-slate-600">
          You do not have permission to access this page.
        </p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700"
>
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}