import { Badge } from "@/components/ui/badge";

type RoleType = "SYS_ADMIN" | "MHO" | "BHW" | "ADMIN" | (string & {});

interface RoleBadgeProps {
  role?: RoleType | null;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; badge: string; }
> = {
  SYS_ADMIN: {
    label: "System Admin",
    badge: "bg-slate-700/10 text-slate-700 dark:text-slate-300 border-black/90 hover:bg-slate-500/15",
  },
  ADMIN: {
    label: "Site Admin",
    badge: "bg-purple-700/10 text-purple-700 dark:text-purple-300 border-purple-500/90 hover:bg-purple-500/15",
  },
  MHO: {
    label: "Municipal Health Officer",
    badge: "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/90 hover:bg-blue-500/15",
  },
  BHW: {
    label: "Barangay Health Worker",
    badge: "bg-emerald-700/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/90 hover:bg-emerald-500/15",
  },
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) {
    return <span className="text-muted-foreground/60 text-xs">—</span>;
  }

  const config = ROLE_CONFIG[role] || {
    label: role,
    badge: "bg-muted text-muted-foreground border-border/60 hover:bg-muted/80",
  };

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${config.badge}`}
    >
      {config.label}
    </Badge>
  );
}