import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Moon, Search, Sun, User as UserIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { BackendStatus } from "@/components/backend-status";
import { useLmsData } from "@/lib/lms-data";
import { apiRequest } from "@/lib/api";

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
    const sync = () => setDark(localStorage.getItem("theme") === "dark");
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("theme-change"));
  };
  return { dark, toggle };
}

function toTitle(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const roleRoutes = {
  admin: ["/dashboard"],
  instructor: [
    "/dashboard",
    "/dashboard/analytics",
    "/dashboard/courses",
    "/dashboard/students",
    "/dashboard/assignments",
    "/dashboard/quizzes",
    "/dashboard/certificates",
    "/dashboard/announcements",
    "/dashboard/discussions",
    "/dashboard/notifications",
    "/dashboard/settings",
  ],
  student: [
    "/dashboard",
    "/dashboard/courses",
    "/dashboard/continue",
    "/dashboard/catalog",
    "/dashboard/assignments",
    "/dashboard/quizzes",
    "/dashboard/certificates",
    "/dashboard/discussions",
    "/dashboard/notifications",
    "/dashboard/settings",
  ],
} as const;

function roleCanOpen(role: keyof typeof roleRoutes, pathname: string) {
  if (role === "admin") return true;
  return roleRoutes[role].some(
    (route) => pathname === route || (route !== "/dashboard" && pathname.startsWith(`${route}/`)),
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const lmsQuery = useLmsData();
  const { notifications } = lmsQuery.data;
  const { user, logout, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { dark, toggle } = useDarkMode();
  const [search, setSearch] = useState("");

  async function markNotificationRead(notificationId: string) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: ["lms-data"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update notification");
    }
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && !roleCanOpen(user.role, pathname)) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, pathname, navigate]);

  if (loading || !user) return null;
  if (!roleCanOpen(user.role, pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-xl flex items-center gap-2 px-4">
            <SidebarTrigger />
            <div className="hidden md:block">
              <Breadcrumb>
                <BreadcrumbList>
                  {segments.map((seg, i) => {
                    const last = i === segments.length - 1;
                    const href = "/" + segments.slice(0, i + 1).join("/");
                    return (
                      <div key={href} className="flex items-center gap-2">
                        <BreadcrumbItem>
                          {last ? (
                            <BreadcrumbPage>{toTitle(seg)}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={href}>{toTitle(seg)}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!last && <BreadcrumbSeparator />}
                      </div>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <BackendStatus />
              <form
                className="relative hidden md:block"
                onSubmit={(event) => {
                  event.preventDefault();
                  navigate({ to: "/dashboard/courses", search: { q: search } });
                }}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses, students…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 w-72 h-9 bg-muted/40"
                />
              </form>

              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unread > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex-col items-start gap-0.5 py-2"
                      onSelect={() => n.unread && void markNotificationRead(n.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-sm font-medium">{n.title}</span>
                        {n.unread && (
                          <Badge variant="secondary" className="ml-auto text-[9px] py-0 px-1.5">
                            New
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{n.body}</span>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </DropdownMenuItem>
                  ))}
                  {!notifications.length && (
                    <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/notifications">View all notifications</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 pl-1.5 pr-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground capitalize">
                        {user.role}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate({ to: "/login" });
                    }}
                    className="text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
            {lmsQuery.isLoading ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>
            ) : lmsQuery.error ? (
              <div className="mx-auto max-w-md py-20 text-center">
                <h2 className="text-lg font-semibold">Dashboard data could not be loaded</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {lmsQuery.error instanceof Error
                    ? lmsQuery.error.message
                    : "Check the backend connection and try again."}
                </p>
                <Button className="mt-5" onClick={() => lmsQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
