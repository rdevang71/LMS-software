import { Award, CheckCircle2, Medal, Printer, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type VerifiedCertificate = {
  id: string;
  course: string;
  student: string;
  instructor: string;
  issued: string;
  courseDuration: string;
  skills: string[];
  marksObtained?: number;
  maxMarks: number;
  percentage?: number | null;
  grade: string;
  badge: string;
  remarks: string;
};

export function CertificateDocument({ certificate }: { certificate: VerifiedCertificate }) {
  const hasMarks =
    certificate.marksObtained !== undefined &&
    certificate.percentage !== null &&
    certificate.percentage !== undefined;

  return (
    <Card className="relative overflow-hidden border-4 border-double border-primary shadow-elegant-lg print:shadow-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1.5px, transparent 1.5px)",
          backgroundSize: "34px 34px",
        }}
      />
      <CardContent className="relative p-8 text-center md:p-14">
        <div className="text-xs font-extrabold tracking-[0.35em] text-primary">LUMENLMS</div>
        <div className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full border-4 border-double border-primary bg-primary text-primary-foreground shadow-lg">
          <div>
            <Medal className="mx-auto h-7 w-7" />
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide">
              {certificate.badge}
            </span>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> Verified digital credential
        </div>
        <h1 className="mt-5 font-serif text-4xl font-bold">Certificate of Completion</h1>
        <p className="mt-6 text-muted-foreground">This certifies that</p>
        <h2 className="mt-2 text-3xl font-bold text-primary">{certificate.student}</h2>
        <p className="mt-5 text-muted-foreground">has successfully completed</p>
        <h3 className="mt-2 text-2xl font-semibold">{certificate.course}</h3>
        {certificate.courseDuration && (
          <p className="mt-2 text-sm text-muted-foreground">
            {certificate.courseDuration} of guided learning
          </p>
        )}

        {hasMarks && (
          <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 divide-x rounded-xl border bg-background/80 py-4">
            <div>
              <strong className="block text-xl text-primary">
                {certificate.marksObtained}/{certificate.maxMarks}
              </strong>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Marks</span>
            </div>
            <div>
              <strong className="block text-xl text-primary">{certificate.percentage}%</strong>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Score</span>
            </div>
            <div>
              <strong className="block text-xl text-primary">{certificate.grade}</strong>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Grade</span>
            </div>
          </div>
        )}

        {certificate.skills.length > 0 && (
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
            {certificate.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="bg-background/80">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        {certificate.remarks && (
          <p className="mx-auto mt-6 max-w-2xl font-serif italic text-muted-foreground">
            “{certificate.remarks}”
          </p>
        )}

        <div className="mt-10 grid gap-6 text-sm sm:grid-cols-3 sm:items-end">
          <div>
            <div className="border-b border-foreground pb-1 font-medium">
              {certificate.instructor}
            </div>
            <span className="text-xs text-muted-foreground">Authorized instructor</span>
          </div>
          <div className="flex justify-center">
            <Award className="h-9 w-9 text-primary" />
          </div>
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-1 sm:justify-end">
              <ShieldCheck className="h-4 w-4 text-success" /> Issued{" "}
              {new Date(certificate.issued).toLocaleDateString()}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{certificate.id}</p>
          </div>
        </div>
        <Button className="mt-8 print:hidden" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
        </Button>
      </CardContent>
    </Card>
  );
}
