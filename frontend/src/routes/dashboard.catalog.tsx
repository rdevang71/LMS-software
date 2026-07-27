import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Star, Users, Clock } from "lucide-react";
import { useLmsData } from "@/lib/lms-data";
import { apiRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";

export const Route = createFileRoute("/dashboard/catalog")({ component: CatalogPage });

function CatalogPage() {
  const {
    data: { courses, myCourses },
  } = useLmsData();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const enrolledIds = new Set(myCourses.map((course) => course.id));
  const list = courses.filter(
    (course) =>
      course.status === "Published" && course.title.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div>
      <PageHeader
        title="Course Catalog"
        description="Discover new courses and expand your skills."
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search catalog…"
          className="pl-9"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.slice(0, 24).map((c) => (
          <Card key={c.id} className="overflow-hidden group hover:shadow-elegant-lg transition-all">
            <div className="relative aspect-video overflow-hidden">
              <img
                src={c.thumbnail}
                alt=""
                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
              />
              <Badge className="absolute top-2 left-2 bg-white/90 text-foreground">
                {c.category}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold line-clamp-2 min-h-[3rem]">{c.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">by {c.instructor}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {c.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {c.students}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {c.duration}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold">{c.price === 0 ? "Free" : formatINR(c.price)}</span>
                <Button
                  size="sm"
                  className="bg-gradient-primary"
                  disabled={enrolledIds.has(c.id) || c.price > 0}
                  onClick={async () => {
                    try {
                      await apiRequest("/enrollments", {
                        method: "POST",
                        body: JSON.stringify({ courseId: c.id }),
                      });
                      await queryClient.invalidateQueries({ queryKey: ["lms-data"] });
                      toast.success("Enrolled successfully");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Enrollment failed");
                    }
                  }}
                >
                  {enrolledIds.has(c.id)
                    ? "Enrolled"
                    : c.price > 0
                      ? "Admin enrollment"
                      : "Enroll free"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
