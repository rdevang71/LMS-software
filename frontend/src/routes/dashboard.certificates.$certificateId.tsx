import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { CertificateDocument, type VerifiedCertificate } from "@/components/certificate-document";

type Verification = {
  certificate: VerifiedCertificate;
};
export const Route = createFileRoute("/dashboard/certificates/$certificateId")({
  component: CertificateVerificationPage,
});
function CertificateVerificationPage() {
  const { certificateId } = Route.useParams();
  const query = useQuery({
    queryKey: ["certificate-verification", certificateId],
    queryFn: () =>
      apiRequest<Verification>(`/certificates/verify/${encodeURIComponent(certificateId)}`),
    refetchInterval: 5_000,
  });
  if (query.isLoading) return <p className="text-muted-foreground">Verifying certificate…</p>;
  if (query.error)
    return (
      <Card>
        <CardContent className="p-10 text-center text-destructive">
          {query.error.message}
        </CardContent>
      </Card>
    );
  if (!query.data) return null;
  const certificate = query.data.certificate;
  return (
    <div className="max-w-4xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard/certificates">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Certificates
        </Link>
      </Button>
      <CertificateDocument certificate={certificate} />
    </div>
  );
}
