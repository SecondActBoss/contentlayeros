import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  PenLine, 
  FileText, 
  Settings2, 
  MessageSquarePlus,
  Layers
} from "lucide-react";

const navItems = [
  {
    title: "Weekly Run",
    url: "/",
    icon: PenLine,
    description: "Generate content",
  },
  {
    title: "Drafts",
    url: "/drafts",
    icon: FileText,
    description: "View generated posts",
  },
  {
    title: "Context",
    url: "/context",
    icon: Layers,
    description: "Manage context inputs",
  },
  {
    title: "Feedback",
    url: "/feedback",
    icon: MessageSquarePlus,
    description: "Record performance",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <PenLine className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">ContentLayerOS</h2>
            <p className="text-xs text-muted-foreground">Content Operating System</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Manual weekly run</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
