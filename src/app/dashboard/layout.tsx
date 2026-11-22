import { requireStaff } from "@/lib/auth";
import { DashboardMobileNav, DashboardSidebar } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar name={profile.full_name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileNav name={profile.full_name} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
