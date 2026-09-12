// src/components/auth/AuthCard.tsx
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface AuthCardProps {
  children: ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      {children}
    </Card>
  );
}