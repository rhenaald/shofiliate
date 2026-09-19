"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export interface NavMainItemData {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

function NavItem({ item }: { item: NavMainItemData }) {
  const pathname = usePathname()
  const isItemActive =
    pathname === item.url ||
    (item.url !== "/dashboard" && pathname.startsWith(item.url))
  const hasSubItems = Boolean(item.items?.length)
  const isSubActive = Boolean(item.items?.some((sub) => pathname === sub.url))

  const [isOpen, setIsOpen] = React.useState(Boolean(item.isActive || isItemActive || isSubActive))

  if (!hasSubItems) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={isItemActive}
          render={<Link href={item.url} />}
        >
          {item.icon}
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isItemActive}
        render={<Link href={item.url} />}
      >
        {item.icon}
        <span>{item.title}</span>
      </SidebarMenuButton>
      <CollapsibleTrigger
        render={
          <SidebarMenuAction className="aria-expanded:rotate-90" />
        }
      >
        <ChevronRightIcon />
        <span className="sr-only">Toggle</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items?.map((subItem) => {
            const isSubActiveItem = pathname === subItem.url
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={isSubActiveItem}
                  render={<Link href={subItem.url} />}
                >
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function NavMain({
  items,
}: {
  items: NavMainItemData[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}


