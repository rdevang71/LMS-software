import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { useLmsData } from "@/lib/lms-data";

export const Route = createFileRoute("/dashboard/continue")({ component: ContinuePage });

function ContinuePage() {
  const {
    data: { myCourses },
  } = useLmsData();
  const inProgress = myCourses.filter((course) => (course.progress ?? 0) < 100);
  return (
    <div>
      <PageHeader title="Continue Learning" description="Pick up right where you left off." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inProgress.map((c) => (
          <Card key={c.id} className="shadow-elegant hover:shadow-elegant-lg overflow-hidden group">
            <div className="relative aspect-video">
              <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <Link
                to="/dashboard/courses/$courseId"
                params={{ courseId: c.id }}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" />
              </Link>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex justify-between text-white text-xs mb-1">
                  <span>Current module</span>
                  <span className="font-semibold">{c.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${c.progress}%` }} />
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold line-clamp-1">{c.title}</h3>
              <p className="text-xs text-muted-foreground">{c.instructor}</p>
              <Button className="w-full mt-3 bg-gradient-primary" asChild>
                <Link to="/dashboard/courses/$courseId" params={{ courseId: c.id }}>
                  Resume lesson
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
