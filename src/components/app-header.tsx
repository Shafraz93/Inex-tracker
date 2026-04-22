"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import * as React from "react";

import { MAIN_NAV_ITEMS } from "@/config/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

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

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 border-b border-border pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="flex h-14 items-center gap-3 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))]">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center justify-start"
        >
          <Image
            src="/logo.png"
            alt="Inex Tracker"
            width={160}
            height={48}
            className="h-8 w-auto max-w-[min(100%,200px)] object-contain object-left"
            priority
          />
        </Link>

        <div className="min-w-0 flex-1" aria-hidden />

        <div className="flex shrink-0 items-center gap-1">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="flex h-full w-[min(100%,20rem)] flex-col gap-0 p-0"
            >
              <SheetHeader className="border-b border-border text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                {MAIN_NAV_ITEMS.map(({ href, label }) => {
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
                  {signingOut ? "Signing out…" : "Sign out"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
