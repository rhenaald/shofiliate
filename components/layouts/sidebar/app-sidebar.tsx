"use client";

import * as React from "react";
import Link from "next/link";
import { PackageIcon, PinIcon, UploadCloudIcon } from "lucide-react";

import { NavMain } from "@/components/layouts/sidebar/nav-main";
import { NavUser } from "@/components/layouts/sidebar/nav-user";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Katalog",
      url: "/dashboard/catalog",
      icon: <PackageIcon />,
    },
    {
      title: "Pins",
      url: "/dashboard/products/pins",
      icon: <PinIcon />,
    },
    {
      title: "Import Produk",
      url: "/dashboard/products/import",
      icon: <UploadCloudIcon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = useSession();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard/catalog" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <PackageIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">Shofiliate</span>
                <span className="truncate text-xs text-muted-foreground">Affiliate Hub</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter>
        {session?.user ? (
          <NavUser
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }}
          />
        ) : isPending ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="grid flex-1 gap-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}

