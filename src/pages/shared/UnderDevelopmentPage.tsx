import { Construction } from "lucide-react";

interface UnderDevelopmentPageProps {
  title: string;
}

export default function UnderDevelopmentPage({
  title,
}: UnderDevelopmentPageProps) {
  return (
    <main className="flex h-[80vh] items-center justify-center">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-lg">
        <Construction className="mx-auto mb-6 h-16 w-16 text-amber-500" />
        <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
        <p className="mt-4 text-slate-600">
          This module is currently under development.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Please check back in a future update.
        </p>
      </div>
    </main>
  );
}
