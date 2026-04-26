"use client";

import Image from "next/image";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import * as React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const [syncing, setSyncing] = React.useState(false);

  function handleSync() {
    setSyncing(true);
    window.dispatchEvent(new CustomEvent("inex-tracker:sync-request"));
    window.setTimeout(() => setSyncing(false), 1200);
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-label="Sync data"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={cn("size-4", syncing ? "animate-spin" : "")} />
            Sync
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
