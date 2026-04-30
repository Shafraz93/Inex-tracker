import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AppProviders } from "@/components/app-providers";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileFooterNav } from "@/components/mobile-footer-nav";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  return (
    <AppProviders>
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeader />
        <DesktopNav />
        <div className="mx-auto w-full max-w-5xl pb-20 md:pb-0">
          {children}
        </div>
        <MobileFooterNav />
      </div>
    </AppProviders>
  );
}
