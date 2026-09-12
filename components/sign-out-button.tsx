"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  labelClassName,
}: {
  className?: string;
  labelClassName?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("[sign-out] failed", error);
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={signOut}
      disabled={pending}
      aria-label="Выйти"
      className={cn("px-3", className)}
    >
      <LogOut className="h-5 w-5" />
      <span className={labelClassName}>Выйти</span>
    </Button>
  );
}
