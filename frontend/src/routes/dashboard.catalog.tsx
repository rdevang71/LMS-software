import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Clock, Lock, Search, Star } from "lucide-react";
import { useLmsData } from "@/lib/lms-data";
import { apiRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
          <Card
            key={c.id}
            className="relative overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-elegant-lg focus-within:ring-2 focus-within:ring-primary"
          >
            <Link
              to="/dashboard/courses/$courseId"
              params={{ courseId: c.id }}
              className="absolute inset-0 z-10 rounded-xl"
              aria-label={`Preview ${c.title}`}
            />
            <div className="relative aspect-video overflow-hidden">
              <img
                src={c.thumbnail}
                alt=""
                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
              />
              <Badge className="absolute top-2 left-2 bg-white/90 text-foreground">
                {c.category}
              </Badge>
              <Badge
                variant="secondary"
                className="absolute right-2 top-2 border-white/30 bg-black/45 text-white backdrop-blur"
              >
                {c.level}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold line-clamp-2 min-h-[3rem]">{c.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">by {c.instructor}</p>
              <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                {c.description || "View the course overview, curriculum, and lecture index."}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {c.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {c.lessons} lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {c.duration}
                </span>
              </div>
              <div className="relative z-20 mt-4 flex items-center justify-between border-t pt-3">
                <Link
                  to="/dashboard/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  View curriculum <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {enrolledIds.has(c.id) ? (
                  <Button size="sm" className="bg-gradient-primary" asChild>
                    <Link to="/dashboard/courses/$courseId" params={{ courseId: c.id }}>
                      Continue
                    </Link>
                  </Button>
                ) : (c.requiresAdminEnrollment ?? c.price > 0) ? (
                  <Button size="sm" variant="secondary" disabled className="gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Admin enrollment
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-gradient-primary"
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
                    Enroll free
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
