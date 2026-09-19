import SidebarLayout from "@/components/layouts/sidebar-layout";
import { requireDashboardSession } from "@/features/auth/data/session";

// Auth gate must block: session check cannot stream behind a shell.
export const instant = false;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardSession();
  return <SidebarLayout>{children}</SidebarLayout>;
}
