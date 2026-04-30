"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAIN_NAV_ITEMS } from "@/config/main-nav";
import { useAppSettings } from "@/contexts/app-settings-context";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  const pathname = usePathname();
  const { settings, hydrated } = useAppSettings();

  const enabledNavItems = MAIN_NAV_ITEMS.filter(
    (item) => !item.feature || (hydrated && settings.app_features[item.feature])
  );

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm max-md:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto px-4 py-2">
        {enabledNavItems.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

