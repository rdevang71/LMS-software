import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, BookOpen, Users, Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { useLmsData, type Instructor } from "@/lib/lms-data";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/instructors")({ component: InstructorsPage });

function InstructorsPage() {
  const {
    data: { instructors },
  } = useLmsData();
  const { save, remove } = useResourceCrud();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  return (
    <div>
      <PageHeader
        title="Instructors"
        description="Meet the educators powering LumenLMS."
        action={
          user?.role === "admin" ? (
            <Button
              className="bg-gradient-primary gap-2"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add instructor
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instructors.map((i) => (
          <Card key={i.id} className="shadow-elegant hover:shadow-elegant-lg transition-all group">
            <CardContent className="p-5 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 -m-1 rounded-full bg-gradient-primary opacity-70 blur-md group-hover:opacity-100 transition-opacity" />
                <Avatar className="h-20 w-20 relative ring-2 ring-background">
                  <AvatarImage src={i.avatar} />
                  <AvatarFallback>{i.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="font-semibold mt-3">{i.name}</h3>
              <Badge variant="secondary" className="mt-1">
                {i.expertise}
              </Badge>
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div>
                  <div className="font-bold text-base flex items-center justify-center gap-0.5">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {i.rating.toFixed(1)}
                  </div>
                  <div className="text-muted-foreground">Rating</div>
                </div>
                <div>
                  <div className="font-bold text-base flex items-center justify-center gap-0.5">
                    <BookOpen className="h-3 w-3" />
                    {i.courses}
                  </div>
                  <div className="text-muted-foreground">Courses</div>
                </div>
                <div>
                  <div className="font-bold text-base flex items-center justify-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {i.students}
                  </div>
                  <div className="text-muted-foreground">Students</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full gap-2"
                onClick={() => (window.location.href = `mailto:${i.email}`)}
              >
                <Mail className="h-3 w-3" />
                Message
              </Button>
              {user?.role === "admin" && (
                <div className="mt-2 flex justify-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(i);
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
                    onClick={() => remove("users", i.id, i.name)}
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
        title={editing ? "Edit instructor" : "Add instructor"}
        fields={[
          { name: "name", label: "Full name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "expertise", label: "Expertise", required: true },
          { name: "rating", label: "Rating", type: "number" },
          {
            name: "password",
            label: editing ? "New password (optional)" : "Password",
            type: "password",
            required: !editing,
          },
        ]}
        initialValues={
          editing
            ? {
                name: editing.name,
                email: editing.email,
                expertise: editing.expertise,
                rating: editing.rating,
                password: "",
              }
            : { expertise: "General", rating: 4.5, password: "" }
        }
        onSubmit={async (values) => {
          const payload = { ...values, rating: Number(values.rating) };
          if (editing) await save("users", editing.id, payload);
          else await save("users/invite", undefined, { ...payload, role: "instructor" });
        }}
      />
    </div>
  );
}
