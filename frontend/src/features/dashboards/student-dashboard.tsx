import {
  BookOpen,
  Award,
  FileText,
  Trophy,
  Flame,
  PlayCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useLmsData } from "@/lib/lms-data";

export function StudentDashboard() {
  const {
    data: { myCourses: enrolledCourses, assignments, certificates, quizzes },
  } = useLmsData();
  const myCourses = enrolledCourses.slice(0, 4);
  const nextUp = myCourses[0];
  const activeCourses = enrolledCourses.filter(
    (course) => (course.progress ?? 0) > 0 && (course.progress ?? 0) < 100,
  ).length;
  const scoredQuizzes = quizzes.filter((quiz) => quiz.myScore !== undefined);
  const averageQuizScore = scoredQuizzes.length
    ? Math.round(
        scoredQuizzes.reduce((sum, quiz) => sum + (quiz.myScore ?? 0), 0) / scoredQuizzes.length,
      )
    : 0;
  const averageProgress = enrolledCourses.length
    ? Math.round(
        enrolledCourses.reduce((sum, course) => sum + (course.progress ?? 0), 0) /
          enrolledCourses.length,
      )
    : 0;
  if (!nextUp)
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold">No enrolled courses yet</h2>
        <p className="mt-2 text-muted-foreground">
          Browse the catalog and enroll to begin learning.
        </p>
        <Button className="mt-5 bg-gradient-primary" asChild>
          <Link to="/dashboard/catalog">Browse catalog</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-hero text-primary-foreground p-6 md:p-8 shadow-elegant-lg">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 30% 40%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <p className="text-sm uppercase tracking-widest text-primary-foreground/80">
              Continue learning
            </p>
            <h1 className="text-3xl font-bold mt-1">{nextUp.title}</h1>
            <p className="mt-2 text-primary-foreground/80">
              {nextUp.lessons} lessons · {nextUp.duration} total
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span className="font-semibold">{nextUp.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${nextUp.progress}%` }}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" className="gap-2" asChild>
                <Link to="/dashboard/continue">
                  <PlayCircle className="h-4 w-4" />
                  Resume
                </Link>
              </Button>
              <Button
                className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20"
                asChild
              >
                <Link to="/dashboard/courses">All courses</Link>
              </Button>
            </div>
          </div>
        </div>

        <Card className="shadow-elegant bg-gradient-to-br from-warning/20 to-warning/5 border-warning/30">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-warning text-warning-foreground flex items-center justify-center">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Learning momentum
                </p>
                <p className="text-3xl font-bold">{activeCourses} active courses</p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Average completion</span>
                <span className="font-semibold">{averageProgress}%</span>
              </div>
              <Progress value={averageProgress} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              Continue a lesson to increase your course progress.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enrolled"
          value={enrolledCourses.length}
          icon={BookOpen}
          hint="active courses"
        />
        <StatCard
          label="Completed"
          value={certificates.length}
          icon={Award}
          accent="success"
          hint="certificates earned"
        />
        <StatCard
          label="Pending"
          value={
            assignments.filter(
              (assignment) => assignment.status === "Pending" || assignment.status === "Late",
            ).length
          }
          icon={FileText}
          accent="warning"
          hint="assignments due"
        />
        <StatCard
          label="Avg. Quiz Score"
          value={`${averageQuizScore}%`}
          icon={Trophy}
          accent="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Courses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/courses">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {myCourses.map((c) => (
              <Link
                key={c.id}
                to="/dashboard/courses/$courseId"
                params={{ courseId: c.id }}
                className="group rounded-xl border overflow-hidden hover:shadow-elegant transition-all"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={c.thumbnail}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute top-2 left-2 bg-white/90 text-foreground">
                    {c.category}
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground truncate">by {c.instructor}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{c.progress}%</span>
                    </div>
                    <Progress value={c.progress} className="h-1.5" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.slice(0, 4).map((a) => (
                <Link
                  key={a.id}
                  to="/dashboard/assignments/$assignmentId"
                  params={{ assignmentId: a.id }}
                  className="flex items-start gap-2 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {a.dueDate.split("-")[2]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.course}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {a.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-base">Recent Certificates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {certificates.slice(0, 2).map((c) => (
                <div key={c.id} className="rounded-lg border p-3 bg-gradient-subtle">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold truncate">{c.course}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {c.id} · {c.issued}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
