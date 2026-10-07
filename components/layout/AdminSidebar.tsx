"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, BriefcaseBusiness, FileText, FolderTree, Gauge, Image, LayoutPanelTop, LogOut, Settings } from "lucide-react";
import { cn } from "@/utils/cn";
import { cmsRequest } from "@/services/cms-api";

type CmsRole = "admin" | "editor" | "viewer";

const navItems = [
  { href: "/admin", label: "Overview", exact: true, icon: Gauge, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/posts", label: "All content", icon: FileText, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/pages", label: "Pages", icon: FileText, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/services", label: "Services", icon: BriefcaseBusiness, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/blog", label: "Blog", icon: BookOpen, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/homepage", label: "Homepage sections", icon: LayoutPanelTop, roles: ["admin", "editor"] },
  { href: "/admin/media", label: "Media library", icon: Image, roles: ["admin", "editor"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<CmsRole | null>(null);

  useEffect(() => {
    cmsRequest<{ data: { role: CmsRole } }>("/api/cms/session")
      .then(({ data }) => setRole(data.role))
      .catch((error: unknown) => console.error("Unable to load CMS permissions.", error));
  }, []);

  const logout = async () => {
    try {
      await cmsRequest("/api/cms/logout", { method: "POST" });
      window.location.assign("/admin-login");
    } catch (error) {
      console.error("Unable to sign out of the CMS.", error);
    }
  };

  return (
    <aside className="flex w-full shrink-0 flex-col bg-[#2b1e30] text-white md:sticky md:top-0 md:h-screen md:w-64">
      <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#b77eae] to-[#75477a] text-lg font-bold text-white shadow-lg shadow-[#1b1020]/40">R</div>
        <div>
          <h1 className="text-base font-bold tracking-wide text-white">ROAR CMS</h1>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8c7dc]">Workspace</p>
        </div>
      </div>
      <div className="hidden px-6 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a997ad] md:block">Workspace</div>
      <nav aria-label="Admin navigation" className="flex flex-row gap-1 overflow-x-auto border-y border-white/10 px-3 py-2 md:flex-1 md:flex-col md:gap-1 md:overflow-visible md:border-y-0 md:px-3 md:py-1">
        {navItems.filter((item) => role && item.roles.includes(role)).map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-[#75477a] text-white ring-1 ring-inset ring-[#b77eae]/50 shadow-sm shadow-[#1b1020]/20" : "text-[#e3dbe6] hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={17} strokeWidth={1.8} className={active ? "text-white" : "text-[#c6b7ca]"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-2 border-white/10 px-4 py-3 md:block md:space-y-1 md:border-t md:px-3 md:py-4">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#c6b7ca] transition-colors hover:bg-white/10 hover:text-white">
          <LayoutPanelTop size={17} strokeWidth={1.8} /> View website
        </Link>
        <button type="button" onClick={() => void logout()} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#c6b7ca] transition-colors hover:bg-white/10 hover:text-white">
          <LogOut size={17} strokeWidth={1.8} /> Sign out
        </button>
      </div>
    </aside>
  );
}
