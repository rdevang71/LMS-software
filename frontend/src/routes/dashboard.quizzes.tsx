import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Pencil, Plus, Play, Trash2 } from "lucide-react";
import { useLmsData, type Quiz } from "@/lib/lms-data";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";

export const Route = createFileRoute("/dashboard/quizzes")({ component: QuizzesRoute });

function QuizzesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/dashboard/quizzes" ? <QuizzesPage /> : <Outlet />;
}

function QuizzesPage() {
  const {
    data: { quizzes, courses, myCourses },
  } = useLmsData();
  const { user } = useAuth();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const availableCourses = user?.role === "admin" ? courses : myCourses;
  return (
    <div>
      <PageHeader
        title="Quizzes"
        description="Assess understanding with quizzes and automatic scoring."
        action={
          user?.role !== "student" ? (
            <Button
              className="bg-gradient-primary gap-2"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New quiz
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((q) => (
          <Card key={q.id} className="shadow-elegant hover:shadow-elegant-lg transition-all group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center">
                  <Trophy className="h-5 w-5" />
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {q.duration}
                </span>
              </div>
              <h3 className="font-semibold line-clamp-2 min-h-[3rem]">{q.title}</h3>
              <p className="text-xs text-muted-foreground">
                {q.questions} questions · {q.attempts} attempts
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {user?.role === "student" ? "My score" : "Avg. score"}
                  </span>
                  <span className="font-semibold">
                    {user?.role === "student" && q.myScore === undefined
                      ? "Not attempted"
                      : `${user?.role === "student" ? q.myScore : q.avgScore}%`}
                  </span>
                </div>
                <Progress
                  value={user?.role === "student" ? (q.myScore ?? 0) : q.avgScore}
                  className="h-2"
                />
              </div>
              <Button className="w-full mt-4 gap-2" variant="outline" asChild>
                <Link to="/dashboard/quizzes/$quizId" params={{ quizId: q.id }}>
                  <Play className="h-3 w-3" />
                  {user?.role === "student" ? "Take quiz" : "Manage questions"}
                </Link>
              </Button>
              {user?.role !== "student" && (
                <div className="mt-2 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(q);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => remove("quizzes", q.id, q.title)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit quiz" : "Create quiz"}
        fields={[
          { name: "title", label: "Title", required: true },
          ...(!editing
            ? [
                {
                  name: "courseId",
                  label: "Course",
                  type: "select" as const,
                  required: true,
                  options: availableCourses.map((course) => ({
                    label: course.title,
                    value: course.id,
                  })),
                },
              ]
            : []),
          { name: "duration", label: "Duration", required: true },
        ]}
        initialValues={
          editing
            ? {
                title: editing.title,
                courseId: editing.courseId,
                duration: editing.duration,
              }
            : { courseId: availableCourses[0]?.id ?? "", duration: "15 min" }
        }
        onSubmit={async (values) => save("quizzes", editing?.id, values)}
      />
    </div>
  );
}
