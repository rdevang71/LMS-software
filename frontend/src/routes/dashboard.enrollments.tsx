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
import { useLmsData } from "@/lib/lms-data";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import type { Enrollment } from "@/lib/lms-data";
import { useAuth } from "@/lib/auth";
import {
  asSelectOptions,
  paymentMethods,
  paymentStatuses,
  validatePaymentDetails,
} from "@/lib/payment-options";

export const Route = createFileRoute("/dashboard/enrollments")({ component: EnrollmentsPage });

function EnrollmentsPage() {
  const {
    data: { enrollments, students, courses },
  } = useLmsData();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Latest course purchases and enrollments."
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
              Add enrollment
            </Button>
          ) : null
        }
      />
      <Card className="shadow-elegant">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total fee</TableHead>
              <TableHead className="text-right">Fee paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              {user?.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={e.studentAvatar} />
                      <AvatarFallback>{e.student[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{e.student}</span>
                  </div>
                </TableCell>
                <TableCell>{e.course}</TableCell>
                <TableCell className="text-muted-foreground">{e.date}</TableCell>
                <TableCell className="text-right font-semibold">${e.amount}</TableCell>
                <TableCell className="text-right text-success font-semibold">
                  ${e.paidAmount}
                </TableCell>
                <TableCell className="text-right">
                  ${Math.max(e.amount - e.paidAmount, 0)}
                </TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>{e.progress}%</TableCell>
                {user?.role === "admin" && (
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(e);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove("enrollments/id", e.id, `${e.student}'s enrollment`)}
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
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit enrollment" : "Add enrollment"}
        description="Record the total fee, payment received, and how it was paid."
        fields={
          editing
            ? [
                {
                  name: "amount",
                  label: "Total fee",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "paidAmount",
                  label: "Fee paid",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "status",
                  label: "Payment status",
                  type: "select",
                  options: asSelectOptions(paymentStatuses),
                },
                {
                  name: "paymentMethod",
                  label: "Payment method",
                  type: "select",
                  options: asSelectOptions(paymentMethods),
                },
              ]
            : [
                {
                  name: "studentId",
                  label: "Student",
                  type: "select",
                  required: true,
                  options: students.map((student) => ({ label: student.name, value: student.id })),
                },
                {
                  name: "courseId",
                  label: "Course",
                  type: "select",
                  required: true,
                  options: courses
                    .filter((course) => course.status === "Published")
                    .map((course) => ({ label: course.title, value: course.id })),
                },
                {
                  name: "amount",
                  label: "Total fee",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "paidAmount",
                  label: "Fee paid",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "status",
                  label: "Payment status",
                  type: "select",
                  options: asSelectOptions(paymentStatuses),
                },
                {
                  name: "paymentMethod",
                  label: "Payment method",
                  type: "select",
                  options: asSelectOptions(paymentMethods),
                },
              ]
        }
        initialValues={
          editing
            ? {
                amount: editing.amount,
                paidAmount: editing.paidAmount,
                status: editing.status,
                paymentMethod: editing.paymentMethod,
              }
            : {
                studentId: students[0]?.id ?? "",
                courseId: courses.find((course) => course.status === "Published")?.id ?? "",
                amount: 0,
                paidAmount: 0,
                status: "Paid",
                paymentMethod: "Cash",
              }
        }
        onSubmit={async (values) => {
          const amount = Number(values.amount);
          const paidAmount = Number(values.paidAmount);
          const validationMessage = validatePaymentDetails(
            amount,
            paidAmount,
            String(values.status),
          );
          if (validationMessage) throw new Error(validationMessage);
          await save(editing ? "enrollments/id" : "enrollments", editing?.id, {
            ...values,
            amount,
            paidAmount,
          });
        }}
      />
    </div>
  );
}
