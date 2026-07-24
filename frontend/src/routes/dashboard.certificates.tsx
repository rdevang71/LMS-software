import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, ExternalLink, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useLmsData, type Certificate } from "@/lib/lms-data";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";

export const Route = createFileRoute("/dashboard/certificates")({ component: CertificatesRoute });

function CertificatesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/dashboard/certificates" ? <CertificatesPage /> : <Outlet />;
}

function CertificatesPage() {
  const {
    data: { certificates, students, courses, myCourses, enrollments },
  } = useLmsData({ refetchInterval: 5_000 });
  const { user } = useAuth();
  const { save, remove } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Certificate | null>(null);
  const availableCourses = user?.role === "admin" ? courses : myCourses;
  function printCertificate(certificate: (typeof certificates)[number]) {
    const popup = window.open("", "_blank");
    if (!popup) return;
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ??
          character,
      );
    const marks =
      certificate.marksObtained === undefined
        ? ""
        : `<div class="results"><div><b>${certificate.marksObtained}/${certificate.maxMarks}</b><span>Marks</span></div><div><b>${certificate.percentage}%</b><span>Score</span></div><div><b>${escapeHtml(certificate.grade)}</b><span>Grade</span></div></div>`;
    const skills = certificate.skills.length
      ? `<div class="skills">${certificate.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>`
      : "";
    popup.document.write(
      `<html><head><title>${escapeHtml(certificate.id)}</title><style>@page{size:landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;text-align:center;color:#18152e;margin:0;padding:20px}section{position:relative;min-height:680px;border:9px double #6455d9;padding:38px 65px;background:radial-gradient(circle at 10% 10%,#f1efff 0 2px,transparent 3px);background-size:36px 36px}.brand{font-weight:800;letter-spacing:3px;color:#6455d9}.seal{margin:12px auto;width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:#6455d9;color:white;border:6px double white;outline:3px solid #6455d9;font-weight:800}.eyebrow{text-transform:uppercase;letter-spacing:4px;color:#6b6780;font-size:12px}h1{font-family:Georgia,serif;font-size:42px;margin:10px}h2{font-size:31px;color:#4338a2;margin:12px}h3{font-size:25px;margin:10px}.results{display:flex;justify-content:center;gap:55px;margin:22px auto}.results div{min-width:90px}.results b{display:block;font-size:20px;color:#4338a2}.results span{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#777}.skills{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.skills span{border:1px solid #b8b1ee;border-radius:20px;padding:5px 12px;font-size:11px;background:#f5f3ff}.remarks{font-family:Georgia,serif;font-style:italic;color:#555;margin:18px auto;max-width:700px}.footer{display:flex;align-items:end;justify-content:space-between;margin-top:30px}.signature{min-width:220px;border-top:1px solid #555;padding-top:7px}.verify{text-align:right;font-size:11px;color:#666}.verify b{display:block;color:#222;font-family:monospace;font-size:12px}</style></head><body><section><div class="brand">LUMENLMS</div><div class="seal">${escapeHtml(certificate.badge)}</div><div class="eyebrow">Verified digital credential</div><h1>Certificate of Completion</h1><p>This certifies that</p><h2>${escapeHtml(certificate.student)}</h2><p>has successfully completed</p><h3>${escapeHtml(certificate.course)}</h3>${certificate.courseDuration ? `<p>${escapeHtml(certificate.courseDuration)} of guided learning</p>` : ""}${marks}${skills}${certificate.remarks ? `<p class="remarks">“${escapeHtml(certificate.remarks)}”</p>` : ""}<div class="footer"><div><div class="signature">${escapeHtml(certificate.instructor)}<br><small>Authorized Instructor</small></div></div><div class="verify">Issued ${escapeHtml(certificate.issued)}<b>${escapeHtml(certificate.id)}</b>Verify at ${escapeHtml(`${window.location.origin}/verify/${certificate.id}`)}</div></div></section><script>window.print()</script></body></html>`,
    );
    popup.document.close();
  }
  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Issue completion certificates with public ID verification."
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
              Issue certificate
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {certificates.map((c) => (
          <Card
            key={c.id}
            className="shadow-elegant hover:shadow-elegant-lg transition-all overflow-hidden"
          >
            <div className="relative bg-gradient-hero p-6 text-primary-foreground">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <Award className="h-8 w-8" />
                  <Shield className="h-4 w-4 opacity-70" />
                </div>
                <p className="text-xs uppercase tracking-widest opacity-80 mt-4">
                  Certificate of Completion
                </p>
                <h3 className="text-2xl font-bold mt-1 leading-tight">{c.course}</h3>
                <p className="text-sm opacity-90 mt-4">Awarded to</p>
                <p className="text-lg font-serif italic">{c.student}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white hover:bg-white/25">{c.badge}</Badge>
                  {c.percentage !== null && c.percentage !== undefined && (
                    <Badge className="bg-white/20 text-white hover:bg-white/25">
                      {c.percentage}% · Grade {c.grade}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-xs">
                <p className="font-mono text-muted-foreground">{c.id}</p>
                <p className="text-muted-foreground">
                  Issued {c.issued} · by {c.instructor}
                </p>
              </div>
              <div className="flex gap-1">
                {user?.role !== "student" && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove("certificates", c.mongoId, c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button size="icon" variant="ghost" asChild>
                  <Link to="/verify/$certificateId" params={{ certificateId: c.id }}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="sm" className="gap-1" onClick={() => printCertificate(c)}>
                  <Download className="h-3 w-3" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit certificate" : "Issue certificate"}
        description="Marks automatically determine the grade and achievement badge shown on the verified credential."
        fields={
          editing
            ? [
                { name: "certificateId", label: "Certificate ID", required: true },
                { name: "issued", label: "Issued date", type: "date", required: true },
                {
                  name: "marksObtained",
                  label: "Marks obtained",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "maxMarks",
                  label: "Maximum marks",
                  type: "number",
                  required: true,
                  min: 1,
                  step: 0.01,
                },
                { name: "remarks", label: "Achievement remarks", type: "textarea" },
              ]
            : [
                { name: "certificateId", label: "Certificate ID", required: true },
                {
                  name: "courseId",
                  label: "Course",
                  type: "select",
                  required: true,
                  resetFields: ["studentId"],
                  options: availableCourses.map((course) => ({
                    label: course.title,
                    value: course.id,
                  })),
                },
                {
                  name: "studentId",
                  label: "Student",
                  type: "select",
                  required: true,
                  options: (values) => {
                    const enrolledStudentIds = new Set(
                      enrollments
                        .filter(
                          (enrollment) =>
                            enrollment.courseId === values.courseId &&
                            enrollment.status !== "Refunded",
                        )
                        .map((enrollment) => enrollment.studentId),
                    );
                    return students
                      .filter((student) => enrolledStudentIds.has(student.id))
                      .map((student) => ({ label: student.name, value: student.id }));
                  },
                },
                { name: "issued", label: "Issued date", type: "date", required: true },
                {
                  name: "marksObtained",
                  label: "Marks obtained",
                  type: "number",
                  required: true,
                  min: 0,
                  step: 0.01,
                },
                {
                  name: "maxMarks",
                  label: "Maximum marks",
                  type: "number",
                  required: true,
                  min: 1,
                  step: 0.01,
                },
                { name: "remarks", label: "Achievement remarks", type: "textarea" },
              ]
        }
        initialValues={
          editing
            ? {
                certificateId: editing.id,
                issued: editing.issued,
                marksObtained: editing.marksObtained ?? 100,
                maxMarks: editing.maxMarks ?? 100,
                remarks: editing.remarks,
              }
            : {
                certificateId: `CERT-${Date.now()}`,
                courseId: availableCourses[0]?.id ?? "",
                studentId:
                  enrollments.find(
                    (enrollment) =>
                      enrollment.courseId === availableCourses[0]?.id &&
                      enrollment.status !== "Refunded",
                  )?.studentId ?? "",
                issued: new Date().toISOString().slice(0, 10),
                marksObtained: 100,
                maxMarks: 100,
                remarks: "",
              }
        }
        onSubmit={async (values) => {
          const marksObtained = Number(values.marksObtained);
          const maxMarks = Number(values.maxMarks);
          if (maxMarks <= 0) throw new Error("Maximum marks must be greater than zero");
          if (marksObtained < 0 || marksObtained > maxMarks)
            throw new Error("Marks obtained must be between zero and maximum marks");
          await save("certificates", editing?.mongoId, {
            ...values,
            marksObtained,
            maxMarks,
          });
        }}
      />
    </div>
  );
}
