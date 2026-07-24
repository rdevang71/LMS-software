import { useEffect, useState } from "react";
import { getBackendHealth, type HealthResponse } from "@/lib/api";

export function BackendStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getBackendHealth(controller.signal)
      .then(setHealth)
      .catch(() => setHealth(null));

    return () => controller.abort();
  }, []);

  const connected = health?.database === "connected";
  const label = connected ? "API & DB connected" : health ? "API connected" : "API offline";

  return (
    <div
      className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex"
      title={health?.message}
    >
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : health ? "bg-amber-500" : "bg-destructive"}`}
      />
      {label}
    </div>
  );
}
