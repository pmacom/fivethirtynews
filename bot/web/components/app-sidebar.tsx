"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// 530 Admin Navigation Data
const data = {
  user: {
    name: "Admin",
    email: "admin@530.app",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "530",
      logo: GalleryVerticalEnd,
      plan: "Tag Management",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Tag Hierarchy",
      url: "/admin/tags",
      icon: Bot,
      items: [
        {
          title: "All Tags",
          url: "/admin/tags",
        },
        {
          title: "Root Categories",
          url: "/admin/tags?filter=root",
        },
        {
          title: "System Tags",
          url: "/admin/tags?filter=system",
        },
      ],
    },
    {
      title: "Tagged Posts",
      url: "/admin/posts",
      icon: BookOpen,
    },
    {
      title: "Database",
      url: "http://127.0.0.1:54323",
      icon: Settings2,
    },
  ],
  projects: [
    {
      name: "Public Site",
      url: "/",
      icon: Frame,
    },
    {
      name: "Tag Statistics",
      url: "/admin/stats",
      icon: PieChart,
    },
    {
      name: "Supabase Studio",
      url: "http://127.0.0.1:54323",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
