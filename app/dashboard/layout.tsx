import SidebarLayout from "@/components/layouts/sidebar-layout";
import { requireDashboardSession } from "@/features/auth/data/session";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardSession();
  return <SidebarLayout>{children}</SidebarLayout>;
}
