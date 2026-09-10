"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRightIcon,
  FileTextIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  TagIcon,
  TagsIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon },
  { href: "/budget", label: "Budget", icon: WalletIcon },
  { href: "/categories", label: "Categories", icon: TagIcon },
  { href: "/classes", label: "Classes", icon: TagsIcon },
  { href: "/descriptions", label: "Descriptions", icon: FileTextIcon },
  { href: "/accounts", label: "Accounts", icon: LandmarkIcon },
];

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r transition-[width]",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        >
          <MenuIcon />
        </Button>
        {!collapsed && <span className="truncate font-semibold">Finances</span>}
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <link.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto p-2">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOutIcon className="size-4" />
          {!collapsed && "Sign out"}
        </Button>
      </form>
    </aside>
  );
}
