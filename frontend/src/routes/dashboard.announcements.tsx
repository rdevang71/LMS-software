import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useLmsData, type Announcement } from "@/lib/lms-data";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const {
    data: { announcements },
  } = useLmsData();
  const { user } = useAuth();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast updates to your entire community."
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
              New announcement
            </Button>
          ) : null
        }
      />
      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id} className="shadow-elegant hover:shadow-elegant-lg transition-all">
            <CardContent className="p-5 flex gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {a.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-2">{a.date}</p>
              </div>
              {(user?.role === "admin" || a.authorId === user?.id) && (
                <div className="flex gap-1">
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
                    onClick={() => remove("announcements", a.id, a.title)}
                  >
                    <Trash2 className="h-4 w-4" />
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
        title={editing ? "Edit announcement" : "New announcement"}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "body", label: "Message", type: "textarea", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: ["info", "success", "warning"].map((type) => ({ label: type, value: type })),
          },
        ]}
        initialValues={
          editing
            ? { title: editing.title, body: editing.body, type: editing.type }
            : { type: "info" }
        }
        onSubmit={async (values) => save("announcements", editing?.id, values)}
      />
    </div>
  );
}
