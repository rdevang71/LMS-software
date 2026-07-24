import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Plus, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { useAuth } from "@/lib/auth";
import { useLmsData } from "@/lib/lms-data";

export const Route = createFileRoute("/dashboard/discussions")({ component: DiscussionsRoute });

function DiscussionsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/dashboard/discussions" ? <DiscussionsPage /> : <Outlet />;
}

function DiscussionsPage() {
  const {
    data: { discussions: threads, courses, myCourses },
  } = useLmsData();
  const { user } = useAuth();
  const { save } = useResourceCrud();
  const [formOpen, setFormOpen] = useState(false);
  const availableCourses = user?.role === "admin" ? courses : myCourses;
  return (
    <div>
      <PageHeader
        title="Discussions"
        description="Course-wide Q&A and community threads."
        action={
          <Button className="bg-gradient-primary gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New discussion
          </Button>
        }
      />
      <div className="space-y-3">
        {threads.map((thread) => (
          <Card key={thread.id} className="shadow-elegant hover:shadow-elegant-lg transition-all">
            <CardContent className="p-5 flex gap-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={thread.author.avatar} />
                <AvatarFallback>{thread.author.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{thread.title}</h3>
                  {thread.answered && (
                    <Badge className="bg-success text-success-foreground text-[10px]">
                      Answered
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {thread.author.name} · in <span className="text-foreground">{thread.course}</span>{" "}
                  · {thread.time}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {thread.replies} replies
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {thread.likes}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/dashboard/discussions/$discussionId"
                  params={{ discussionId: thread.id }}
                >
                  Open thread
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Start a discussion"
        fields={[
          { name: "title", label: "Question", required: true },
          { name: "body", label: "Details", type: "textarea", required: true },
          {
            name: "courseId",
            label: "Course",
            type: "select",
            required: true,
            options: availableCourses.map((course) => ({ label: course.title, value: course.id })),
          },
        ]}
        initialValues={{ title: "", body: "", courseId: availableCourses[0]?.id ?? "" }}
        onSubmit={(values) => save("discussions", undefined, values)}
      />
    </div>
  );
}
