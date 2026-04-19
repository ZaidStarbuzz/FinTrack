import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  // cookies() may have different typing across Next versions (sync or Promise-based).
  // Cast to any to tolerate both and provide getAll/setAll wrappers used by supabase
  const cs: any = cookieStore;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cs.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cs.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
