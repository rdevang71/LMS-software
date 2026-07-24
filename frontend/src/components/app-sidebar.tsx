import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FolderKanban,
  ClipboardList,
  FileText,
  Award,
  Megaphone,
  BarChart3,
  CreditCard,
  Settings,
  UserCircle,
  Trophy,
  MessageSquare,
  Bell,
  PlayCircle,
  TrendingUp,
  PenSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type UserRole } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const nav: Record<UserRole, { label: string; items: NavItem[] }[]> = {
  admin: [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Reports & Analytics", url: "/dashboard/analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Users",
      items: [
        { title: "Students", url: "/dashboard/students", icon: GraduationCap },
        { title: "Instructors", url: "/dashboard/instructors", icon: Users },
      ],
    },
    {
      label: "Learning",
      items: [
        { title: "Courses", url: "/dashboard/courses", icon: BookOpen },
        { title: "Categories", url: "/dashboard/categories", icon: FolderKanban },
        { title: "Enrollments", url: "/dashboard/enrollments", icon: ClipboardList },
        { title: "Assignments", url: "/dashboard/assignments", icon: FileText },
        { title: "Quizzes", url: "/dashboard/quizzes", icon: Trophy },
        { title: "Certificates", url: "/dashboard/certificates", icon: Award },
      ],
    },
    {
      label: "Business",
      items: [
        { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
        { title: "Announcements", url: "/dashboard/announcements", icon: Megaphone },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
      ],
    },
  ],
  instructor: [
    {
      label: "Teaching",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "My Courses", url: "/dashboard/courses", icon: BookOpen },
        { title: "Create Course", url: "/dashboard/courses/new", icon: PenSquare },
        { title: "Students", url: "/dashboard/students", icon: GraduationCap },
      ],
    },
    {
      label: "Assessments",
      items: [
        { title: "Assignments", url: "/dashboard/assignments", icon: FileText },
        { title: "Quizzes", url: "/dashboard/quizzes", icon: Trophy },
        { title: "Certificates", url: "/dashboard/certificates", icon: Award },
      ],
    },
    {
      label: "Engagement",
      items: [
        { title: "Announcements", url: "/dashboard/announcements", icon: Megaphone },
        { title: "Discussions", url: "/dashboard/discussions", icon: MessageSquare },
        { title: "Analytics", url: "/dashboard/analytics", icon: TrendingUp },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
      ],
    },
  ],
  student: [
    {
      label: "Learn",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "My Courses", url: "/dashboard/courses", icon: BookOpen },
        { title: "Continue Learning", url: "/dashboard/continue", icon: PlayCircle },
        { title: "Browse Catalog", url: "/dashboard/catalog", icon: FolderKanban },
      ],
    },
    {
      label: "Progress",
      items: [
        { title: "Assignments", url: "/dashboard/assignments", icon: FileText },
        { title: "Quizzes", url: "/dashboard/quizzes", icon: Trophy },
        { title: "Certificates", url: "/dashboard/certificates", icon: Award },
      ],
    },
    {
      label: "Community",
      items: [
        { title: "Discussions", url: "/dashboard/discussions", icon: MessageSquare },
        { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
        { title: "Profile", url: "/dashboard/settings", icon: UserCircle },
      ],
    },
  ],
};

export function AppSidebar() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const collapsed = state === "collapsed";

  if (!user) return null;
  const sections = nav[user.role];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">
                Lumen<span className="text-gradient">LMS</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {user.role === "admin"
                  ? "Admin Console"
                  : user.role === "instructor"
                    ? "Instructor"
                    : "Student"}
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active =
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url}>
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
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
