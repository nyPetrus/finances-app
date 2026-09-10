import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return <SidebarNav />;
}
