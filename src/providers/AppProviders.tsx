import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SystemControlProvider } from "@/contexts/SystemControlContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <SystemControlProvider>
          {children}
        </SystemControlProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
