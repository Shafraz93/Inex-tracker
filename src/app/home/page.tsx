import { redirect } from "next/navigation";

import { HomeContent } from "@/components/home-content";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/");
  }

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col">
      <main className="flex flex-1 flex-col justify-center">
        <HomeContent email={user.email} />
      </main>
    </div>
  );
}
