"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { UserRound } from "lucide-react";

/** Who is checking out (shown in the focused checkout header). */
export default function CheckoutHeaderUser() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground md:inline-flex">
      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
      {user.name}
    </span>
  );
}
