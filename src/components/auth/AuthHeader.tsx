// src/components/auth/AuthHeader.tsx
interface AuthHeaderProps {
  title: string;
  description: string;
}

export default function AuthHeader({
  title,
  description,
}: AuthHeaderProps) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="text-base text-slate-500">{description}</p>
    </div>
  );
}