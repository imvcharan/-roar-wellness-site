import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getCmsRole } from "@/lib/cms-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!await getCmsRole()) redirect("/admin-login?next=%2Fadmin");

  return (
    <div className="flex min-h-screen flex-col bg-cms-background md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-5 sm:p-8">
        {children}
      </main>
    </div>
  );
}