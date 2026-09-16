import SidebarLayout from "@/components/layouts/sidebar-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
