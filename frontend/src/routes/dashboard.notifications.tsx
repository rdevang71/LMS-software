import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useLmsData } from "@/lib/lms-data";
import { apiRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const {
    data: { notifications },
  } = useLmsData();
  const queryClient = useQueryClient();
  async function markRead(notificationId: string) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: ["lms-data"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update notification");
    }
  }
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay on top of assignments, quizzes, and course updates."
      />
      <div className="space-y-2">
        {notifications.map((n) => (
          <Card
            key={n.id}
            onClick={() => n.unread && markRead(n.id)}
            className={`shadow-elegant transition-all cursor-pointer ${n.unread ? "border-primary/40 bg-primary/5" : ""}`}
          >
            <CardContent className="p-4 flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{n.title}</p>
                  {n.unread && (
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
