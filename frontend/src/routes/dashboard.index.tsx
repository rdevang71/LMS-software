import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AdminDashboard } from "@/features/dashboards/admin-dashboard";
import { InstructorDashboard } from "@/features/dashboards/instructor-dashboard";
import { StudentDashboard } from "@/features/dashboards/student-dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "instructor") return <InstructorDashboard />;
  return <StudentDashboard />;
}
