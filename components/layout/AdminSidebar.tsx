"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3, BookOpen, BriefcaseBusiness, FileText, FolderTree, Gauge, Image, LayoutPanelTop, LogOut, Mail, Settings, ShieldCheck } from "lucide-react";
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
  { href: "/admin/enquiries", label: "Enquiries", icon: Mail, roles: ["admin"] },
  { href: "/admin/activity", label: "Activity log", icon: Activity, roles: ["admin"] },
  { href: "/admin/security", label: "Security", icon: ShieldCheck, roles: ["admin", "editor", "viewer"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
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
    <aside className="flex w-full shrink-0 flex-col bg-[#3e372f] text-[#fffcf5] md:sticky md:top-0 md:h-screen md:w-64">
      <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#a1806e] to-[#695f53] text-lg font-bold text-white shadow-lg shadow-black/20">R</div>
        <div>
          <h1 className="text-base font-bold tracking-wide text-white">ROAR CMS</h1>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4cabb]">Workspace</p>
        </div>
      </div>
      <div className="hidden px-6 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bfb3a4] md:block">Workspace</div>
      <nav aria-label="Admin navigation" className="admin-sidebar-navigation flex flex-row gap-1 overflow-x-auto border-y border-white/10 px-3 py-2 md:min-h-0 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:overscroll-contain md:border-y-0 md:px-3 md:py-1">
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
                active ? "bg-[#8d6b57] text-white ring-1 ring-inset ring-[#d4cabb]/40 shadow-sm shadow-black/20" : "text-[#ede9dd] hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={17} strokeWidth={1.8} className={active ? "text-white" : "text-[#d4cabb]"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-2 border-white/10 px-4 py-3 md:block md:space-y-1 md:border-t md:px-3 md:py-4">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#d4cabb] transition-colors hover:bg-white/10 hover:text-white">
          <LayoutPanelTop size={17} strokeWidth={1.8} /> View website
        </Link>
        <button type="button" onClick={() => void logout()} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#d4cabb] transition-colors hover:bg-white/10 hover:text-white">
          <LogOut size={17} strokeWidth={1.8} /> Sign out
        </button>
      </div>
    </aside>
  );
}
