import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useLmsData, type Assignment } from "@/lib/lms-data";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";

export const Route = createFileRoute("/dashboard/assignments")({ component: AssignmentsRoute });

function AssignmentsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/dashboard/assignments" ? <AssignmentsPage /> : <Outlet />;
}

const statusColor: Record<string, string> = {
  Pending: "bg-warning/20 text-warning-foreground border-warning/30",
  Submitted: "bg-primary/20 text-primary border-primary/30",
  Graded: "bg-success/20 text-success border-success/30",
  Returned: "bg-secondary text-secondary-foreground",
  Late: "bg-destructive/20 text-destructive border-destructive/30",
};

function AssignmentsPage() {
  const {
    data: { assignments, courses, myCourses, students, enrollments },
  } = useLmsData({ refetchInterval: 5_000 });
  const { user } = useAuth();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const availableCourses = user?.role === "admin" ? courses : myCourses;
  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Track submissions, deadlines, and grades."
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
              New assignment
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4">
        {assignments.map((a) => (
          <Card key={a.id} className="shadow-elegant hover:shadow-elegant-lg transition-all">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{a.course}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {a.dueDate}
                  </span>
                  <span>{a.submissions} submissions</span>
                  <span>
                    {a.audience === "Selected students"
                      ? `${a.assignedStudentIds.length} selected students`
                      : "All enrolled students"}
                  </span>
                  {a.grade !== undefined && (
                    <span className="text-success font-semibold">
                      Grade: {a.grade}/{a.maxScore}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor[a.status]}>{a.status}</Badge>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link to="/dashboard/assignments/$assignmentId" params={{ assignmentId: a.id }}>
                    <Upload className="h-3 w-3" />
                    {user?.role === "student" ? "Open & submit" : "View submissions"}
                  </Link>
                </Button>
                {user?.role !== "student" && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(a);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove("assignments", a.id, a.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit assignment" : "Create assignment"}
        description="Choose a course, then assign this work to every enrolled student or selected students only."
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Instructions", type: "textarea", required: true },
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
                  resetFields: ["assignedStudentIds"],
                },
              ]
            : []),
          {
            name: "audience",
            label: "Assign to",
            type: "select",
            required: true,
            resetFields: ["assignedStudentIds"],
            options: [
              { label: "All enrolled students in this course", value: "All course students" },
              { label: "Selected students from this course", value: "Selected students" },
            ],
          },
          {
            name: "assignedStudentIds",
            label: "Course students",
            type: "multiselect",
            required: true,
            visibleWhen: (values) => values.audience === "Selected students",
            options: (values) => {
              const enrolledStudentIds = new Set(
                enrollments
                  .filter(
                    (enrollment) =>
                      enrollment.courseId === values.courseId && enrollment.status !== "Refunded",
                  )
                  .map((enrollment) => enrollment.studentId),
              );
              return students
                .filter((student) => enrolledStudentIds.has(student.id))
                .map((student) => ({ label: student.name, value: student.id }));
            },
          },
          { name: "dueDate", label: "Due date", type: "date", required: true },
          { name: "maxScore", label: "Maximum score", type: "number", required: true },
        ]}
        initialValues={
          editing
            ? {
                title: editing.title,
                description: editing.description,
                courseId: editing.courseId,
                audience: editing.audience,
                assignedStudentIds: editing.assignedStudentIds.join(","),
                dueDate: editing.dueDate,
                maxScore: editing.maxScore,
              }
            : {
                courseId: availableCourses[0]?.id ?? "",
                audience: "All course students",
                assignedStudentIds: "",
                description: "",
                dueDate: new Date(Date.now() + 604800000).toISOString().slice(0, 10),
                maxScore: 100,
              }
        }
        onSubmit={async (values) =>
          save("assignments", editing?.id, {
            ...values,
            assignedStudentIds:
              values.audience === "Selected students"
                ? String(values.assignedStudentIds).split(",").filter(Boolean)
                : [],
            maxScore: Number(values.maxScore),
          })
        }
      />
    </div>
  );
}
