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
  MoreHorizontalIcon,
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

// Phone bottom bar: the day-to-day pages (Accounts included — it's where
// Sync lives) get a slot each; the setup pages go behind "More", along with
// Sign out. Five slots is the most a ~400px-wide phone fits legibly.
const BOTTOM_BAR_HREFS = ["/", "/budget", "/search", "/accounts"];
const bottomBarLinks = links.filter((link) => BOTTOM_BAR_HREFS.includes(link.href));
const moreLinks = links.filter((link) => !BOTTOM_BAR_HREFS.includes(link.href));

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
    <>
      <BottomNav pathname={pathname} />

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

function NavContent({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  return (
    <>
      <nav className="flex flex-col gap-1 px-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            title={collapsed ? link.label : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              isActiveLink(link.href, pathname)
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        ))}
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
    </>
  );
}

// Text-entry fields (not checkboxes/buttons) — while one has focus the
// on-screen keyboard is up, and the bar would just eat the space above it.
function isTextEntry(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "hidden"].includes(el.type);
}

function BottomNav({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => setTyping(isTextEntry(e.target));
    const onFocusOut = () => setTyping(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const moreActive = moreLinks.some((link) => isActiveLink(link.href, pathname));
  const itemClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs",
      active ? "font-medium text-foreground" : "text-muted-foreground",
    );
  const iconClass = (active: boolean) =>
    cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-muted");

  return (
    <>
      {/* z-35: above the Dashboard table's sticky cells (z-30), below the
          Search filter sheet (z-40) and dialogs (z-50). */}
      <nav
        aria-label="Main"
        className={cn(
          "fixed inset-x-0 bottom-0 z-35 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden",
          typing && "hidden",
        )}
      >
        {bottomBarLinks.map((link) => {
          const active = isActiveLink(link.href, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={itemClass(active)}
            >
              <span className={iconClass(active)}>
                <link.icon className="size-5" />
              </span>
              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={itemClass(moreActive)}
        >
          <span className={iconClass(moreActive)}>
            <MoreHorizontalIcon className="size-5" />
          </span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal aria-label="More pages">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-xl border-t bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
            <div className="flex items-center justify-between px-4 pb-1">
              <span className="font-semibold">More</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                title="Close"
              >
                <XIcon />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 px-2">
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActiveLink(link.href, pathname) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-base",
                    isActiveLink(link.href, pathname) ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                >
                  <link.icon className="size-5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </Link>
              ))}
            </nav>
            <form action={signOut} className="mt-1 border-t px-2 pt-1">
              <Button type="submit" variant="ghost" className="h-auto w-full justify-start gap-3 px-3 py-3 text-base text-muted-foreground">
                <LogOutIcon className="size-5" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
