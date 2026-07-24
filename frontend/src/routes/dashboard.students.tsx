import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLmsData, type Student } from "@/lib/lms-data";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/students")({ component: StudentsPage });

function StudentsPage() {
  const {
    data: { students },
  } = useLmsData();
  const { user } = useAuth();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const filtered = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  return (
    <div>
      <PageHeader
        title="Students"
        description={`${students.length} learners across the platform.`}
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
              Invite student
            </Button>
          ) : null
        }
      />
      <Card className="shadow-elegant">
        <div className="p-4 border-b flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search students…"
              className="pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="w-[200px]">Progress</TableHead>
              <TableHead>Joined</TableHead>
              {user?.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={s.avatar} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{s.enrolled} courses</Badge>
                </TableCell>
                <TableCell>{s.completed}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={s.progress} className="h-2" />
                    <span className="text-xs w-8">{s.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.joined}</TableCell>
                {user?.role === "admin" && (
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(s);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove("users", s.id, s.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {filtered.length ? (page - 1) * perPage + 1 : 0}–
            {Math.min(page * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit student" : "Create student"}
        description={
          !editing ? "The student can sign in immediately with the password you set." : undefined
        }
        fields={[
          { name: "name", label: "Full name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          {
            name: "password",
            label: editing ? "New password (optional)" : "Password",
            type: "password",
            required: !editing,
          },
        ]}
        initialValues={
          editing
            ? { name: editing.name, email: editing.email, password: "" }
            : { password: "12345678" }
        }
        onSubmit={async (values) => {
          if (editing) await save("users", editing.id, values);
          else await save("users/invite", undefined, { ...values, role: "student" });
        }}
      />
    </div>
  );
}
