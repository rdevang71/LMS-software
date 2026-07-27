import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Download,
  IndianRupee,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { useLmsData, type Enrollment } from "@/lib/lms-data";
import { useState } from "react";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { useAuth } from "@/lib/auth";
import {
  asSelectOptions,
  paymentMethods,
  paymentStatuses,
  validatePaymentDetails,
} from "@/lib/payment-options";
import { formatINR } from "@/lib/currency";

export const Route = createFileRoute("/dashboard/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const {
    data: { enrollments, stats, students, courses },
  } = useLmsData();
  const { save, remove } = useResourceCrud();
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { user } = useAuth();
  function exportTransactions() {
    const rows = [
      "Invoice,Student,Course,Date,Status,Total fee (INR),Fee paid (INR),Balance (INR),Payment method",
      ...enrollments.map((entry) =>
        [
          `INV-${entry.id.slice(-8).toUpperCase()}`,
          entry.student,
          `"${entry.course.replaceAll('"', '""')}"`,
          entry.date,
          entry.status,
          entry.amount,
          entry.paidAmount,
          Math.max(entry.amount - entry.paidAmount, 0),
          entry.paymentMethod,
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <PageHeader
        title="Payments"
        description="Manage transactions, invoices, and refunds."
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
              Add transaction
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total revenue" value={formatINR(stats.revenue)} icon={IndianRupee} />
        <StatCard
          label="Successful"
          value={
            enrollments.filter((entry) => entry.status === "Paid" || entry.status === "Free").length
          }
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Refunded"
          value={enrollments.filter((entry) => entry.status === "Refunded").length}
          icon={CreditCard}
          accent="warning"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="shadow-elegant bg-gradient-to-br from-primary/10 to-primary-glow/10 border-primary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Manual transactions</h3>
              <p className="text-xs text-muted-foreground">
                Payments recorded in the local MongoDB database
              </p>
            </div>
            <Badge className="ml-auto bg-success text-success-foreground">Active</Badge>
          </CardContent>
        </Card>
        <Card className="shadow-elegant">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary-glow flex items-center justify-center text-primary-foreground font-bold">
              R
            </div>
            <div>
              <h3 className="font-semibold">Razorpay</h3>
              <p className="text-xs text-muted-foreground">UPI, cards, netbanking</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" disabled>
              Not configured
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent transactions</CardTitle>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportTransactions}>
            <Download className="h-3 w-3" />
            Export
          </Button>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Total fee</TableHead>
              <TableHead className="text-right">Fee paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              {user?.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">
                  INV-{e.id.slice(-8).toUpperCase()}
                </TableCell>
                <TableCell>{e.student}</TableCell>
                <TableCell className="truncate max-w-[200px]">{e.course}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.date}</TableCell>
                <TableCell>
                  <Badge
                    variant={e.status === "Refunded" ? "secondary" : "default"}
                    className={e.status !== "Refunded" ? "bg-success text-success-foreground" : ""}
                  >
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell>{e.paymentMethod}</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(e.amount)}</TableCell>
                <TableCell className="text-right font-semibold text-success">
                  {formatINR(e.paidAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatINR(Math.max(e.amount - e.paidAmount, 0))}
                </TableCell>
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
                      onClick={() => remove("enrollments/id", e.id, `transaction ${e.id}`)}
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
        title={editing ? "Edit payment" : "Add payment"}
        description="Record the enrollment fee, amount received, and payment method."
        fields={
          editing
            ? [
                {
                  name: "amount",
                  label: "Total fee (INR)",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "paidAmount",
                  label: "Fee paid (INR)",
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
                  label: "Total fee (INR)",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "paidAmount",
                  label: "Fee paid (INR)",
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
          if (editing)
            await save("enrollments/id", editing.id, {
              amount,
              paidAmount,
              status: values.status,
              paymentMethod: values.paymentMethod,
            });
          else await save("enrollments", undefined, { ...values, amount, paidAmount });
        }}
      />
    </div>
  );
}
