import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Star,
  Users,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLmsData, type Course } from "@/lib/lms-data";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/currency";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";

export const Route = createFileRoute("/dashboard/courses")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
  }),
  component: CoursesRoute,
});

function CoursesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/dashboard/courses" ? <CoursesPage /> : <Outlet />;
}

function CoursesPage() {
  const {
    data: { courses, myCourses, categories, instructors },
  } = useLmsData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  const [cat, setCat] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<Course | null>(null);
  const { save, remove } = useResourceCrud();

  const filtered = (user?.role === "admin" ? courses : myCourses).filter(
    (c) => (cat === "all" || c.category === cat) && c.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Courses"
        description={
          user?.role === "student"
            ? "Your enrolled courses and catalog."
            : "Manage your course catalog, content, and pricing."
        }
        action={
          user?.role !== "student" ? (
            <Button
              type="button"
              className="bg-gradient-primary shadow-glow gap-2"
              onClick={() => navigate({ to: "/dashboard/courses/new" })}
            >
              <Plus className="h-4 w-4" />
              New course
            </Button>
          ) : null
        }
      />

      <Card className="mb-4 shadow-elegant">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses…"
              className="pl-9"
            />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border p-0.5">
            <Button
              size="sm"
              variant={view === "grid" ? "secondary" : "ghost"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.slice(0, 24).map((c) => (
            <Card
              key={c.id}
              className="relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-elegant-lg transition-all focus-within:ring-2 focus-within:ring-primary"
            >
              {user?.role === "student" && (
                <Link
                  to="/dashboard/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="absolute inset-0 z-10 rounded-xl"
                  aria-label={`Open ${c.title}`}
                />
              )}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={c.thumbnail}
                  alt=""
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <Badge className="absolute top-2 left-2 bg-white/90 text-foreground">
                  {c.category}
                </Badge>
                {user?.role !== "student" &&
                  (c.price === 0 ? (
                    <Badge className="absolute top-2 right-2 bg-success text-success-foreground">
                      Free
                    </Badge>
                  ) : (
                    <Badge className="absolute top-2 right-2 bg-white/90 text-foreground">
                      {formatINR(c.price)}
                    </Badge>
                  ))}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2 min-h-[3rem]">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">by {c.instructor}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="font-semibold text-foreground">{c.rating.toFixed(1)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {c.students.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {c.duration}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {c.level}
                  </Badge>
                  {user?.role === "student" ? (
                    <span className="text-sm font-medium text-primary">Open course →</span>
                  ) : (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/dashboard/courses/$courseId" params={{ courseId: c.id }}>
                        Manage content
                      </Link>
                    </Button>
                  )}
                  {user?.role !== "student" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove("courses", c.id, c.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-elegant">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Rating</TableHead>
                {user?.role !== "student" && <TableHead>Price</TableHead>}
                <TableHead>Status</TableHead>
                {user?.role !== "student" && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 20).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <img src={c.thumbnail} alt="" className="h-9 w-14 rounded object-cover" />
                      <Link
                        to="/dashboard/courses/$courseId"
                        params={{ courseId: c.id }}
                        className="truncate max-w-[240px] hover:text-primary hover:underline"
                      >
                        {c.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{c.instructor}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.category}</Badge>
                  </TableCell>
                  <TableCell>{c.level}</TableCell>
                  <TableCell>{c.students.toLocaleString()}</TableCell>
                  <TableCell>⭐ {c.rating.toFixed(1)}</TableCell>
                  {user?.role !== "student" && (
                    <TableCell>{c.price === 0 ? "Free" : formatINR(c.price)}</TableCell>
                  )}
                  <TableCell>
                    <Badge variant={c.status === "Published" ? "default" : "outline"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  {user?.role !== "student" && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove("courses", c.id, c.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <ResourceFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit course"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "category",
            label: "Category",
            type: "select",
            required: true,
            options: categories.map((category) => ({ label: category, value: category })),
          },
          ...(user?.role === "admin"
            ? [
                {
                  name: "instructorId",
                  label: "Instructor",
                  type: "select" as const,
                  required: true,
                  options: instructors.map((instructor) => ({
                    label: instructor.name,
                    value: instructor.id,
                  })),
                },
              ]
            : []),
          {
            name: "level",
            label: "Level",
            type: "select",
            options: ["Beginner", "Intermediate", "Advanced"].map((level) => ({
              label: level,
              value: level,
            })),
          },
          { name: "price", label: "Price (INR)", type: "number" },
          { name: "duration", label: "Duration" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["Published", "Draft", "Archived"].map((status) => ({
              label: status,
              value: status,
            })),
          },
        ]}
        initialValues={
          editing
            ? {
                title: editing.title,
                description: editing.description,
                category: editing.category,
                instructorId: editing.instructorId,
                level: editing.level,
                price: editing.price,
                duration: editing.duration,
                status: editing.status,
              }
            : {}
        }
        onSubmit={async (values) => {
          if (editing)
            await save("courses", editing.id, { ...values, price: Number(values.price) });
        }}
      />
    </div>
  );
}
