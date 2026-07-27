import {
  Users,
  BookOpen,
  GraduationCap,
  IndianRupee,
  TrendingUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLmsData } from "@/lib/lms-data";
import { useAuth } from "@/lib/auth";
import { formatCompactINR, formatINR } from "@/lib/currency";

const COLORS = [
  "oklch(0.52 0.22 275)",
  "oklch(0.68 0.19 295)",
  "oklch(0.65 0.17 155)",
  "oklch(0.78 0.16 75)",
  "oklch(0.6 0.24 27)",
  "oklch(0.72 0.18 330)",
];

export function AdminDashboard() {
  const {
    data: {
      revenueData,
      enrollmentData,
      categoryDistribution,
      enrollments,
      courses,
      stats,
      announcements,
    },
  } = useLmsData();
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero text-primary-foreground p-6 md:p-8 shadow-elegant-lg">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 40%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary-foreground/80">
              Admin Console
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">Welcome, {user?.name}</h1>
            <p className="mt-2 text-primary-foreground/80 max-w-2xl">
              Here's what's happening across LumenLMS today. Current measured growth is{" "}
              {stats.growth}%.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" asChild>
              <Link to="/dashboard/courses">Manage Courses</Link>
            </Button>
            <Button
              className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20"
              asChild
            >
              <Link to="/dashboard/analytics">
                View Reports <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents.toLocaleString()}
          icon={GraduationCap}
          trend={stats.growth}
          hint="vs last month"
        />
        <StatCard
          label="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          accent="success"
        />
        <StatCard
          label="Active Instructors"
          value={stats.activeInstructors}
          icon={Users}
          accent="warning"
        />
        <StatCard
          label="Revenue"
          value={formatCompactINR(stats.revenue)}
          icon={IndianRupee}
          trend={stats.growth}
          accent="primary"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Revenue & Enrollment Growth</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Last 7 months</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats.growth >= 0 ? "+" : ""}
              {stats.growth}%
            </Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData} margin={{ left: -12, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.22 275)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.52 0.22 275)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="stuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.19 295)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.68 0.19 295)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactINR(Number(value))}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === "revenue" ? [formatINR(Number(value)), "Revenue"] : [value, "Students"]
                  }
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.52 0.22 275)"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="oklch(0.68 0.19 295)"
                  strokeWidth={2.5}
                  fill="url(#stuGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <p className="text-xs text-muted-foreground">Course distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Enrollments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={enrollmentData} margin={{ left: -12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="enrollments" fill="oklch(0.68 0.19 295)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <p className="text-xs text-muted-foreground">Across all published courses</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-gradient">{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
            {courses.slice(0, 3).map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="truncate">{c.title}</span>
                  <span className="font-semibold">{c.completionRate ?? 0}%</span>
                </div>
                <Progress value={c.completionRate ?? 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Enrollments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/enrollments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {enrollments.slice(0, 6).map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={e.studentAvatar} />
                  <AvatarFallback>{e.student[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.student}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    enrolled in <span className="text-foreground">{e.course}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatINR(e.amount)}</p>
                  <p className="text-xs text-muted-foreground">{e.date}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border p-3 hover:shadow-elegant transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {a.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{a.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
