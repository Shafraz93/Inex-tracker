"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Menu, Plus, Settings, User } from "lucide-react";
import * as React from "react";

import { MAIN_NAV_ITEMS } from "@/config/main-nav";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function IconLink({
  href,
  label,
  children,
  emphasized = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  emphasized?: boolean;
}) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex flex-1 items-center justify-center rounded-xl border border-transparent p-2 text-muted-foreground transition-colors",
        active ? "text-foreground" : "hover:bg-muted/60",
        emphasized ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
      )}
    >
      {children}
    </Link>
  );
}

export function MobileFooterNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, hydrated } = useAppSettings();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const enabledNavItems = React.useMemo(
    () =>
      MAIN_NAV_ITEMS.filter(
        (item) => !item.feature || (hydrated && settings.app_features[item.feature])
      ),
    [hydrated, settings.app_features]
  );
  const quickAddItems = React.useMemo(() => {
    const items = [
      { label: "New Income log", href: "/income" },
      { label: "New Expense log", href: "/expenses" },
    ];
    if (!hydrated) return items;
    if (settings.app_features.credits) {
      items.push({ label: "New Credit log", href: "/credits" });
    }
    if (settings.app_features.seetu) {
      items.push({ label: "New Seetu log", href: "/seetu/pools" });
    }
    if (settings.app_features.vehicle_logs) {
      items.push({ label: "New Vehicle log", href: "/vehicle-logs" });
    }
    if (settings.app_features.salary_advance) {
      items.push({ label: "Advance log", href: "/salary-advance" });
    }
    return items;
  }, [hydrated, settings.app_features]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setMenuOpen(false);
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  function handleMenuOpenChange(next: boolean) {
    setMenuOpen(next);
    if (next) setQuickAddOpen(false);
  }

  function handleQuickAddOpenChange(next: boolean) {
    setQuickAddOpen(next);
    if (next) setMenuOpen(false);
  }

  return (
    <footer className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-background/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <IconLink href="/profile" label="Profile">
          <User className="size-5" />
        </IconLink>

        <Sheet open={menuOpen} onOpenChange={handleMenuOpenChange}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                className="flex-1 rounded-xl p-2"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent
            side="bottom"
            className="z-40 flex h-auto w-full flex-col gap-0 pb-10"
            overlayClassName="z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
          >
            <SheetHeader className="border-b border-border text-left">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
              {enabledNavItems.map(({ href, label }) => {
                const active =
                  href === "/"
                    ? pathname === "/"
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <SheetFooter className="border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <IconLink href="/" label="Home" emphasized>
          <Home className="size-5" />
        </IconLink>

        <IconLink href="/settings" label="Settings">
          <Settings className="size-5" />
        </IconLink>

        <Sheet open={quickAddOpen} onOpenChange={handleQuickAddOpenChange}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                className="flex-1 rounded-xl p-2"
                aria-label="Open quick add menu"
              >
                <Plus className="size-5" />
              </Button>
            }
          />
          <SheetContent
            side="bottom"
            className="z-40 flex h-auto w-full flex-col gap-0 pb-10"
            overlayClassName="z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
          >
            <SheetHeader className="border-b border-border text-left">
              <SheetTitle>Quick Add</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4">
              {quickAddItems.map((item, idx) => (
                <Link
                  key={`${item.label}-${idx}`}
                  href={item.href}
                  onClick={() => setQuickAddOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </footer>
  );
}
