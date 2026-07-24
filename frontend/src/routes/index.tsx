import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/login", replace: true });
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
      <div className="h-12 w-12 rounded-full border-4 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
    </div>
  );
}
