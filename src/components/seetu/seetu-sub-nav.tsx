"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SeetuSubNav() {
  const pathname = usePathname();

  function item(href: string, label: string) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "border-b-2 pb-2 text-sm font-medium transition-colors",
          active
            ? "text-foreground border-primary"
            : "text-muted-foreground hover:text-foreground border-transparent"
        )}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav className="mb-8 flex flex-wrap gap-8 border-b border-border pb-px">
      {item("/seetu/pools", "Pools")}
      {item("/seetu/payouts", "Payouts")}
    </nav>
  );
}
