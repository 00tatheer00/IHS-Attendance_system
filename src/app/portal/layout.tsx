import { requireStudent } from "@/lib/auth";
import { PortalNav, PortalHeader } from "./portal-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStudent();
  return (
    <div className="min-h-dvh">
      <PortalHeader name={profile.full_name} />
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-28">{children}</main>
      <PortalNav />
    </div>
  );
}
