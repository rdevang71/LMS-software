import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CertificateDocument, type VerifiedCertificate } from "@/components/certificate-document";

type Verification = {
  certificate: VerifiedCertificate;
};

export const Route = createFileRoute("/verify/$certificateId")({
  component: PublicCertificateVerification,
});

function PublicCertificateVerification() {
  const { certificateId } = Route.useParams();
  const query = useQuery({
    queryKey: ["public-certificate-verification", certificateId],
    queryFn: () =>
      apiRequest<Verification>(`/certificates/verify/${encodeURIComponent(certificateId)}`),
    refetchInterval: 5_000,
  });

  if (query.isLoading) {
    return <div className="min-h-screen grid place-items-center">Verifying certificate...</div>;
  }
  if (query.error || !query.data) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-10 text-center">
            <h1 className="text-xl font-semibold text-destructive">Certificate not verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {query.error instanceof Error ? query.error.message : "Certificate not found"}
            </p>
            <Button className="mt-5" asChild>
              <Link to="/login">Go to LumenLMS</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const certificate = query.data.certificate;
  return (
    <main className="min-h-screen bg-gradient-subtle p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        <CertificateDocument certificate={certificate} />
      </div>
    </main>
  );
}
