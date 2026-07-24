import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Paperclip,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api";
import type { CoursePlayerData, Lesson } from "@/lib/learning";
import { deleteUploadedAsset, uploadToCloudinary } from "@/lib/cloudinary";

export const Route = createFileRoute("/dashboard/courses/$courseId")({
  component: CoursePlayerPage,
});

function CoursePlayerPage() {
  const { courseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState("");
  const [uploadedVideoPublicId, setUploadedVideoPublicId] = useState("");
  const pendingVideoSaved = useRef(false);
  const [mediaUpload, setMediaUpload] = useState<{
    type: "lecture" | "resource" | "thumbnail";
    progress: number;
  } | null>(null);
  const query = useQuery({
    queryKey: ["course-player", courseId],
    queryFn: () => apiRequest<CoursePlayerData>(`/courses/${courseId}/player`),
  });
  const lessons = useMemo(
    () => [...(query.data?.course.courseContent ?? [])].sort((a, b) => a.order - b.order),
    [query.data],
  );
  useEffect(() => {
    if (lessons.length && !lessons.some((lesson) => lesson._id === selectedId))
      setSelectedId(lessons[0]._id);
  }, [lessons, selectedId]);
  const selected = lessons.find((lesson) => lesson._id === selectedId);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["course-player", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["lms-data"] }),
    ]);
  }
  const complete = useMutation({
    mutationFn: (lessonId: string) =>
      apiRequest(`/courses/${courseId}/lessons/${lessonId}/complete`, { method: "PATCH" }),
    onSuccess: async () => {
      await refresh();
      toast.success("Lesson marked complete");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update progress"),
  });
  async function saveLesson(values: Record<string, string | number>) {
    const path = editing
      ? `/courses/${courseId}/lessons/${editing._id}`
      : `/courses/${courseId}/lessons`;
    await apiRequest(path, {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify({
        ...values,
        order: Number(values.order),
        ...(uploadedVideoPublicId ? { videoPublicId: uploadedVideoPublicId } : {}),
      }),
    });
    await refresh();
    pendingVideoSaved.current = true;
    setUploadedVideo("");
    setUploadedVideoPublicId("");
    toast.success(editing ? "Lesson updated" : "Lesson added");
  }
  async function deleteLesson(lesson: Lesson) {
    if (!window.confirm(`Delete “${lesson.title}”?`)) return;
    try {
      await apiRequest(`/courses/${courseId}/lessons/${lesson._id}`, { method: "DELETE" });
      setSelectedId("");
      await refresh();
      toast.success("Lesson deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete lesson");
    }
  }
  async function saveResource(values: Record<string, string | number>) {
    await apiRequest(`/courses/${courseId}/resources`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    await refresh();
    toast.success("Resource added");
  }
  async function deleteResource(resourceId: string) {
    if (!window.confirm("Delete this resource?")) return;
    try {
      await apiRequest(`/courses/${courseId}/resources/${resourceId}`, { method: "DELETE" });
      await refresh();
      toast.success("Resource deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete resource");
    }
  }
  async function uploadLecture(file: File, lesson?: Lesson) {
    let newPublicId = "";
    let persisted = false;
    try {
      setMediaUpload({ type: "lecture", progress: 0 });
      const uploaded = await uploadToCloudinary(file, "lecture", (progress) =>
        setMediaUpload({ type: "lecture", progress }),
      );
      newPublicId = uploaded.publicId;
      if (lesson) {
        await apiRequest(`/courses/${courseId}/lessons/${lesson._id}`, {
          method: "PATCH",
          body: JSON.stringify({ videoUrl: uploaded.url, videoPublicId: uploaded.publicId }),
        });
        persisted = true;
        await refresh();
        toast.success("Lecture video replaced");
      } else {
        if (uploadedVideoPublicId) {
          await deleteUploadedAsset(uploadedVideoPublicId, "lecture");
        }
        setEditing(null);
        pendingVideoSaved.current = false;
        setUploadedVideo(uploaded.url);
        setUploadedVideoPublicId(uploaded.publicId);
        setFormOpen(true);
        toast.success("Video uploaded. Add the lesson details.");
      }
    } catch (error) {
      if (newPublicId && !persisted)
        await deleteUploadedAsset(newPublicId, "lecture").catch(() => undefined);
      toast.error(error instanceof Error ? error.message : "Video upload failed");
    } finally {
      setMediaUpload(null);
    }
  }
  async function uploadResourceFile(file: File) {
    let newPublicId = "";
    let persisted = false;
    try {
      setMediaUpload({ type: "resource", progress: 0 });
      const uploaded = await uploadToCloudinary(file, "resource", (progress) =>
        setMediaUpload({ type: "resource", progress }),
      );
      newPublicId = uploaded.publicId;
      await apiRequest(`/courses/${courseId}/resources`, {
        method: "POST",
        body: JSON.stringify({
          title: file.name,
          url: uploaded.url,
          type: file.type || "file",
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
        }),
      });
      persisted = true;
      await refresh();
      toast.success("Course resource uploaded");
    } catch (error) {
      if (newPublicId && !persisted)
        await deleteUploadedAsset(newPublicId, "resource").catch(() => undefined);
      toast.error(error instanceof Error ? error.message : "Resource upload failed");
    } finally {
      setMediaUpload(null);
    }
  }
  async function uploadThumbnail(file: File) {
    let newPublicId = "";
    let persisted = false;
    try {
      setMediaUpload({ type: "thumbnail", progress: 0 });
      const uploaded = await uploadToCloudinary(file, "thumbnail", (progress) =>
        setMediaUpload({ type: "thumbnail", progress }),
      );
      newPublicId = uploaded.publicId;
      await apiRequest(`/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          thumbnail: uploaded.url,
          thumbnailPublicId: uploaded.publicId,
        }),
      });
      persisted = true;
      await refresh();
      toast.success("Course thumbnail updated");
    } catch (error) {
      if (newPublicId && !persisted)
        await deleteUploadedAsset(newPublicId, "thumbnail").catch(() => undefined);
      toast.error(error instanceof Error ? error.message : "Thumbnail upload failed");
    } finally {
      setMediaUpload(null);
    }
  }

  if (query.isLoading) return <p className="text-muted-foreground">Loading course player…</p>;
  if (query.error)
    return (
      <Card>
        <CardContent className="p-6 text-destructive">{query.error.message}</CardContent>
      </Card>
    );
  if (!query.data) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/dashboard/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Courses
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{query.data.course.title}</h1>
          <p className="text-sm text-muted-foreground">
            Instructor: {query.data.course.instructor}
          </p>
        </div>
        {query.data.canManage ? (
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium cursor-pointer hover:bg-accent">
              <Upload className="h-4 w-4 mr-2" />
              {mediaUpload?.type === "thumbnail"
                ? `Uploading ${mediaUpload.progress}%`
                : "Thumbnail"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  event.target.files?.[0] && uploadThumbnail(event.target.files[0])
                }
              />
            </label>
            <label className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium cursor-pointer hover:bg-accent">
              <Upload className="h-4 w-4 mr-2" />
              {mediaUpload?.type === "lecture"
                ? `Uploading ${mediaUpload.progress}%`
                : "Upload lecture"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) =>
                  event.target.files?.[0] && uploadLecture(event.target.files[0])
                }
              />
            </label>
            <label className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium cursor-pointer hover:bg-accent">
              <Paperclip className="h-4 w-4 mr-2" />
              {mediaUpload?.type === "resource"
                ? `Uploading ${mediaUpload.progress}%`
                : "Upload file"}
              <input
                type="file"
                className="hidden"
                onChange={(event) =>
                  event.target.files?.[0] && uploadResourceFile(event.target.files[0])
                }
              />
            </label>
            <Button variant="outline" onClick={() => setResourceOpen(true)} className="gap-2">
              <Paperclip className="h-4 w-4" />
              Add resource
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setUploadedVideo("");
                setUploadedVideoPublicId("");
                setFormOpen(true);
              }}
              className="gap-2 bg-gradient-primary"
            >
              <Plus className="h-4 w-4" />
              Add lesson
            </Button>
          </div>
        ) : (
          <div className="w-full sm:w-64">
            <div className="mb-1 flex justify-between text-xs">
              <span>Course progress</span>
              <span>{query.data.progress}%</span>
            </div>
            <Progress value={query.data.progress} />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden shadow-elegant">
          {selected ? (
            <>
              <div className="aspect-video bg-black">
                {selected.videoUrl ? (
                  <video
                    key={selected.videoUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full"
                    src={selected.videoUrl}
                  >
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/70">
                    <PlayCircle className="h-14 w-14" />
                  </div>
                )}
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{selected.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {selected.duration}
                  </Badge>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7">{selected.content}</div>
                {!query.data.canManage && !query.data.completedLessons.includes(selected._id) && (
                  <Button
                    disabled={complete.isPending}
                    onClick={() => complete.mutate(selected._id)}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark lesson complete
                  </Button>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="p-10 text-center text-muted-foreground">
              No lessons have been added yet.
            </CardContent>
          )}
        </Card>

        <Card className="h-fit shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base">Course lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessons.map((lesson, index) => {
              const done = query.data.completedLessons.includes(lesson._id);
              return (
                <div
                  key={lesson._id}
                  className={`rounded-lg border p-3 ${selectedId === lesson._id ? "border-primary bg-primary/5" : ""}`}
                >
                  <button
                    className="w-full text-left flex gap-3"
                    onClick={() => setSelectedId(lesson._id)}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground">
                        Lesson {index + 1} · {lesson.duration}
                      </span>
                      <span className="block text-sm font-medium truncate">{lesson.title}</span>
                    </span>
                  </button>
                  {query.data.canManage && (
                    <div className="flex justify-end mt-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(lesson);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3" />
                      </Button>
                      <label
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md cursor-pointer hover:bg-accent"
                        title="Replace lecture video"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(event) =>
                            event.target.files?.[0] && uploadLecture(event.target.files[0], lesson)
                          }
                        />
                      </label>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteLesson(lesson)}
                      >
                        <Trash2 className="h-3.5 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-4 mt-4 border-t">
              <p className="text-sm font-semibold mb-2">Resources</p>
              {query.data.course.resources?.length ? (
                query.data.course.resources.map((resource) => (
                  <div
                    key={resource._id}
                    className="flex items-center gap-2 rounded-md border p-2 mb-2"
                  >
                    <Paperclip className="h-4 w-4 text-primary" />
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 truncate text-sm hover:text-primary hover:underline"
                    >
                      {resource.title}
                    </a>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    {query.data.canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteResource(resource._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No course resources yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ResourceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && uploadedVideoPublicId && !pendingVideoSaved.current) {
            void deleteUploadedAsset(uploadedVideoPublicId, "lecture").catch(() => undefined);
          }
          if (!open) pendingVideoSaved.current = false;
          if (!open) setUploadedVideo("");
          if (!open) setUploadedVideoPublicId("");
        }}
        title={editing ? "Edit lesson" : "Add lesson"}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "videoUrl", label: "Video URL", placeholder: "https://…/video.mp4" },
          { name: "duration", label: "Duration", placeholder: "10 min" },
          { name: "content", label: "Lesson notes", type: "textarea" },
          { name: "order", label: "Order", type: "number", required: true },
        ]}
        initialValues={
          editing
            ? {
                title: editing.title,
                description: editing.description,
                videoUrl: editing.videoUrl,
                duration: editing.duration,
                content: editing.content,
                order: editing.order,
              }
            : {
                title: "",
                description: "",
                videoUrl: uploadedVideo,
                duration: "10 min",
                content: "",
                order: lessons.length + 1,
              }
        }
        onSubmit={saveLesson}
      />
      <ResourceFormDialog
        open={resourceOpen}
        onOpenChange={setResourceOpen}
        title="Add course resource"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "url", label: "Resource URL", required: true, placeholder: "https://…" },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: [
              { label: "Link", value: "link" },
              { label: "PDF", value: "application/pdf" },
              { label: "File", value: "file" },
            ],
          },
        ]}
        initialValues={{ title: "", url: "", type: "link" }}
        onSubmit={saveResource}
      />
    </div>
  );
}
