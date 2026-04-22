import { HomeContent } from "@/components/home-content";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <main className="flex flex-1 flex-col justify-center">
        <HomeContent email={user.email} />
      </main>
    </div>
  );
}
