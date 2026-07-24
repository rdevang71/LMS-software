import {
  BookOpen,
  Users,
  FileText,
  TrendingUp,
  Star,
  PenSquare,
  Video,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLmsData } from "@/lib/lms-data";
import { useAuth } from "@/lib/auth";

export function InstructorDashboard() {
  const {
    data: {
      myCourses: ownedCourses,
      students,
      assignments,
      enrollmentData,
      enrollments,
      recentSubmissions,
      stats,
    },
  } = useLmsData();
  const { user } = useAuth();
  const myCourses = ownedCourses.slice(0, 6);
  const pendingSubmissions = stats.pendingSubmissions;
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status !== "Refunded");
  const averageCompletion = activeEnrollments.length
    ? Math.round(
        activeEnrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) /
          activeEnrollments.length,
      )
    : 0;
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero text-primary-foreground p-6 md:p-8 shadow-elegant-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary-foreground/80">
              Instructor
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">
              Ready to teach today, {user?.name}?
            </h1>
            <p className="mt-2 text-primary-foreground/80">
              You have {pendingSubmissions} assignments that still need attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2" asChild>
              <Link to="/dashboard/courses/new">
                <PenSquare className="h-4 w-4" />
                New Course
              </Link>
            </Button>
            <Button
              className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 gap-2"
              asChild
            >
              <Link
                to={ownedCourses[0] ? "/dashboard/courses/$courseId" : "/dashboard/courses/new"}
                params={ownedCourses[0] ? { courseId: ownedCourses[0].id } : {}}
              >
                <Video className="h-4 w-4" />
                Manage lessons
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Courses" value={ownedCourses.length} icon={BookOpen} />
        <StatCard label="Total Students" value={students.length} icon={Users} accent="success" />
        <StatCard
          label="Submissions"
          value={assignments.reduce((sum, assignment) => sum + assignment.submissions, 0)}
          icon={FileText}
          accent="warning"
          hint="need grading"
        />
        <StatCard
          label="Avg. Completion"
          value={`${averageCompletion}%`}
          icon={TrendingUp}
          accent="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle>Student Engagement</CardTitle>
            <p className="text-xs text-muted-foreground">
              Daily active learners across your courses
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={enrollmentData} margin={{ left: -12, right: 12 }}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.19 295)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.68 0.19 295)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="enrollments"
                  stroke="oklch(0.68 0.19 295)"
                  strokeWidth={2.5}
                  fill="url(#engGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { icon: PenSquare, label: "New Course", to: "/dashboard/courses/new" },
              { icon: FileText, label: "Assignment", to: "/dashboard/assignments" },
              { icon: Video, label: "Lessons", to: "/dashboard/courses" },
              { icon: Upload, label: "Resources", to: "/dashboard/courses" },
            ].map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="rounded-xl border p-4 hover:bg-accent hover:border-primary/40 transition-all group"
              >
                <a.icon className="h-5 w-5 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-left">{a.label}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Courses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/courses">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {myCourses.map((c) => {
              const progress = c.completionRate ?? 0;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <img src={c.thumbnail} alt="" className="h-14 w-20 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {c.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {c.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">{c.students} students</span>
                    </div>
                    <Progress value={progress} className="h-1 mt-2" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSubmissions.slice(0, 5).map((submission) => (
              <div key={submission.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={submission.studentAvatar} />
                  <AvatarFallback>{submission.student[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{submission.student}</p>
                  <p className="text-xs text-muted-foreground truncate">{submission.assignment}</p>
                </div>
                <Badge
                  variant={submission.status === "Graded" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {submission.status}
                </Badge>
              </div>
            ))}
            {!recentSubmissions.length && (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
