import { useAuth } from "@/features/auth/hooks/useAuth";

export default function DashboardPage() {
  const { profile, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("An unexpected error occurred.");
      }
    }
  }

  return (
    <div className="p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>

          {profile && (
            <p className="mt-2 text-slate-600">
              Welcome, {profile.first_name}!
            </p>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}