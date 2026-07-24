import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Code,
  Database,
  Palette,
  Briefcase,
  Megaphone,
  Camera,
  Music,
  Languages,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLmsData } from "@/lib/lms-data";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { useAuth } from "@/lib/auth";

const icons = [Code, Database, Palette, Briefcase, Megaphone, Camera, Music, Languages];
const gradients = [
  "from-primary to-primary-glow",
  "from-success to-primary",
  "from-warning to-destructive",
  "from-primary-glow to-warning",
  "from-destructive to-primary",
  "from-primary to-success",
  "from-warning to-primary-glow",
  "from-primary-glow to-success",
];

export const Route = createFileRoute("/dashboard/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const {
    data: { categoryRecords, courses },
  } = useLmsData();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize courses into discoverable topics."
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
              New category
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categoryRecords.map((category, i) => {
          const cat = category.name;
          const Icon = icons[i % icons.length];
          const count = courses.filter((c) => c.category === cat).length;
          return (
            <Card
              key={cat}
              className="shadow-elegant hover:shadow-elegant-lg transition-all overflow-hidden group"
            >
              <CardContent className="p-0">
                <div
                  className={`h-32 bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center relative`}
                >
                  <Icon className="h-12 w-12 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{cat}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{count} courses</p>
                  {user?.role === "admin" && (
                    <div className="mt-3 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(category);
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
                        onClick={() => remove("categories", category.id, category.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit category" : "Create category"}
        fields={[{ name: "name", label: "Category name", required: true }]}
        initialValues={editing ? { name: editing.name } : {}}
        onSubmit={async (values) => save("categories", editing?.id, values)}
      />
    </div>
  );
}
