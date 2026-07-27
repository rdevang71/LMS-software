import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLmsData } from "@/lib/lms-data";
import { StatCard } from "@/components/stat-card";
import { TrendingUp, Users, IndianRupee, Trophy } from "lucide-react";
import { formatCompactINR, formatINR } from "@/lib/currency";

export const Route = createFileRoute("/dashboard/analytics")({ component: AnalyticsPage });

const COLORS = [
  "oklch(0.52 0.22 275)",
  "oklch(0.68 0.19 295)",
  "oklch(0.65 0.17 155)",
  "oklch(0.78 0.16 75)",
  "oklch(0.6 0.24 27)",
  "oklch(0.72 0.18 330)",
];

function AnalyticsPage() {
  const {
    data: { revenueData, enrollmentData, categoryDistribution, stats },
  } = useLmsData();
  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Deep insights into learners, revenue, and course performance."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Revenue"
          value={formatINR(stats.revenue)}
          icon={IndianRupee}
          trend={stats.growth}
        />
        <StatCard label="Students" value={stats.totalStudents} icon={Users} accent="success" />
        <StatCard
          label="Completion rate"
          value={`${stats.completionRate}%`}
          icon={Trophy}
          accent="warning"
        />
        <StatCard label="Growth" value={`+${stats.growth}%`} icon={TrendingUp} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(value) => formatCompactINR(Number(value))} />
                <Tooltip formatter={(value) => [formatINR(Number(value)), "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.52 0.22 275)"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Weekly enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="oklch(0.68 0.19 295)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-elegant lg:col-span-2">
          <CardHeader>
            <CardTitle>Category distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
