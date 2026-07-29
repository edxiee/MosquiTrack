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
      <h1 className="text-4xl font-bold tracking-tight">
        {title}
      </h1>

      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}