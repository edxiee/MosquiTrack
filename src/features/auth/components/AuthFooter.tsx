import { Link } from "react-router-dom";

interface AuthFooterProps {
  text: string;
  linkText: string;
  href: string;
}

export default function AuthFooter({
  text,
  linkText,
  href,
}: AuthFooterProps) {
  return (
    <div className="border-t pt-6 text-center text-sm text-muted-foreground">
      {text}{" "}

      <Link
        className="font-medium text-emerald-600 hover:text-emerald-700"
        to={href}
      >
        {linkText}
      </Link>
    </div>
  );
}