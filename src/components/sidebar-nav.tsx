"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoxIcon,
  FileTextIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/budget", label: "Budget", icon: WalletIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/categories", label: "Categories & Classes", icon: BoxIcon },
  { href: "/descriptions", label: "Descriptions", icon: FileTextIcon },
  { href: "/accounts", label: "Accounts", icon: LandmarkIcon },
];

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
    } catch {
      // ignore inaccessible storage
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const currentLabel = links.find((link) => isActiveLink(link.href, pathname))?.label;

  return (
    <>
      {/* Phone: slim top bar + slide-in drawer instead of a permanent sidebar. */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background p-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          title="Open menu"
        >
          <MenuIcon className="size-6" />
        </Button>
        <span className="truncate font-semibold">{currentLabel ?? "Finances"}</span>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col border-r bg-background shadow-lg">
            <div className="flex items-center gap-2 p-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                title="Close menu"
              >
                <XIcon />
              </Button>
              <span className="truncate font-semibold">Finances</span>
            </div>
            <NavContent pathname={pathname} collapsed={false} touch onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] md:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <MenuIcon />
          </Button>
          {!collapsed && <span className="truncate font-semibold">Finances</span>}
        </div>
        <NavContent pathname={pathname} collapsed={collapsed} />
      </aside>
    </>
  );
}

function isActiveLink(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavContent({
  pathname,
  collapsed,
  touch = false,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  touch?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex flex-col gap-1 px-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={collapsed ? link.label : undefined}
            className={cn(
              "flex items-center rounded-md px-2",
              // The phone drawer gets bigger text and icons to match its
              // taller, finger-sized rows.
              touch ? "gap-3 py-3 text-base" : "gap-2 py-1.5 text-sm",
              isActiveLink(link.href, pathname)
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className={cn("shrink-0", touch ? "size-5" : "size-4")} />
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        ))}
      </nav>

      <form action={signOut} className="mt-auto p-2">
        <Button
          type="submit"
          variant="ghost"
          size={touch ? "default" : "sm"}
          className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start", touch && "gap-3 px-2 text-base")}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOutIcon className={touch ? "size-5" : "size-4"} />
          {!collapsed && "Sign out"}
        </Button>
      </form>
    </>
  );
}
