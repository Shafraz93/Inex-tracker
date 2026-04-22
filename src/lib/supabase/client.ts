import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicConfig } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = requireSupabasePublicConfig();
  return createBrowserClient(url, anonKey);
}
