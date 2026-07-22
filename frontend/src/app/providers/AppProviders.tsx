import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import QueryProvider from "./QueryProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({
  children,
}: AppProvidersProps) {
  return (
    <QueryProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </QueryProvider>
  );
}