import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { error: authError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col">
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
