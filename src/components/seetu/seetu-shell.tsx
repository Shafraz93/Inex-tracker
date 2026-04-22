"use client";

import * as React from "react";

import { SeetuProvider } from "@/contexts/seetu-context";

import { SeetuSubNav } from "./seetu-sub-nav";

export function SeetuShell({ children }: { children: React.ReactNode }) {
  return (
    <SeetuProvider>
      <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
        <p className="text-muted-foreground mb-6 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          Seetu pools sync to your account via Supabase. Sign in on any device
          to see the same data. If you had data saved only in this browser
          before, it is uploaded once when your cloud is empty.
        </p>
        <SeetuSubNav />
        {children}
      </div>
    </SeetuProvider>
  );
}
