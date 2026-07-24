import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  accent?: "primary" | "success" | "warning" | "destructive";
  hint?: string;
}

const accentBg: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-gradient-primary shadow-glow",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "primary", hint }: Props) {
  return (
    <Card className="relative overflow-hidden border shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gradient-primary opacity-[0.06] blur-2xl" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {(trend !== undefined || hint) && (
              <div className="flex items-center gap-1.5 text-xs">
                {trend !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-semibold",
                      trend >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {trend >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(trend)}%
                  </span>
                )}
                {hint && <span className="text-muted-foreground">{hint}</span>}
              </div>
            )}
          </div>
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center text-primary-foreground",
              accentBg[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
