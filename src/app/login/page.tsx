import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { error: authError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="bg-background relative flex min-h-full flex-1 flex-col">
      <ThemeToggle className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 md:top-4 md:right-4" />
      {authError === "auth" ? (
        <p
          className="text-destructive bg-destructive/10 px-4 py-3 text-center text-sm"
          role="alert"
        >
          Something went wrong while signing in. Please try again.
        </p>
      ) : null}
      <main className="flex flex-1 flex-col justify-center">
        <AuthForm />
      </main>
    </div>
  );
}
