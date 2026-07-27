import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Lock,
  Paperclip,
  Pencil,
  PlayCircle,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const enroll = useMutation({
    mutationFn: () =>
      apiRequest("/enrollments", {
        method: "POST",
        body: JSON.stringify({ courseId }),
      }),
    onSuccess: async () => {
      await refresh();
      toast.success("Enrolled successfully");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Enrollment failed"),
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
  const { course, instructorProfile } = query.data;
  const previewing = !query.data.canManage && !query.data.isEnrolled;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to={previewing ? "/dashboard/catalog" : "/dashboard/courses"}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {previewing ? "Back to catalog" : "Back to courses"}
        </Link>
      </Button>

      <Card className="overflow-hidden border-0 bg-gradient-hero text-primary-foreground shadow-elegant-lg">
        <div className="grid md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="relative min-h-52 overflow-hidden">
            <img
              src={course.thumbnail}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/20 bg-white/15 text-white">{course.category}</Badge>
              <Badge className="border-white/20 bg-white/15 text-white">{course.level}</Badge>
              {previewing && (
                <Badge className="border-white/20 bg-white/15 text-white">
                  <Lock className="mr-1 h-3 w-3" />
                  Preview
                </Badge>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-primary-foreground/80">
              {course.description || "Explore the curriculum, lessons, and learning outcomes."}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/85">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {lessons.length} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {course.duration}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course.students} learners
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current" />
                {course.rating.toFixed(1)}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm">Created by {course.instructor}</span>
              {previewing &&
                (query.data.requiresAdminEnrollment ? (
                  <Button disabled variant="secondary">
                    Contact admin to enroll
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={enroll.isPending}
                    onClick={() => enroll.mutate()}
                  >
                    {enroll.isPending ? "Enrolling…" : "Enroll and start learning"}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Course overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h2 className="font-semibold">About this course</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {course.description || "A structured course designed to build practical skills."}
              </p>
            </div>
            <div>
              <h2 className="font-semibold">What you’ll learn</h2>
              {course.outcomes?.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {course.outcomes.map((outcome) => (
                    <div key={outcome} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Learning outcomes will be added by the instructor.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base">Your instructor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={instructorProfile.avatar} />
                <AvatarFallback>
                  <UserRound className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{instructorProfile.name}</p>
                <p className="text-xs text-muted-foreground">{instructorProfile.expertise}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {instructorProfile.bio || "An experienced instructor focused on practical learning."}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-medium">{instructorProfile.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">instructor rating</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Course content</h2>
          <p className="text-sm text-muted-foreground">
            {previewing
              ? "Explore the syllabus and lesson notes. Enroll to unlock lecture playback."
              : "Select a lesson to continue learning."}
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
        ) : query.data.isEnrolled ? (
          <div className="w-full sm:w-64">
            <div className="mb-1 flex justify-between text-xs">
              <span>Course progress</span>
              <span>{query.data.progress}%</span>
            </div>
            <Progress value={query.data.progress} />
          </div>
        ) : (
          <Badge variant="outline" className="w-fit gap-1.5 py-1.5">
            <ShieldCheck className="h-4 w-4" />
            Curriculum preview
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden shadow-elegant">
          {selected ? (
            <>
              <div className="aspect-video bg-black">
                {query.data.canAccessContent && selected.videoUrl ? (
                  <video
                    key={selected.videoUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full"
                    src={selected.videoUrl}
                  >
                    Your browser does not support video playback.
                  </video>
                ) : previewing && selected.videoAvailable ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                      <Lock className="h-6 w-6" />
                    </div>
                    <p className="mt-4 font-semibold">Lecture locked</p>
                    <p className="mt-1 max-w-sm text-sm text-white/65">
                      Enroll in this course to play this lecture.
                    </p>
                  </div>
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
                {query.data.isEnrolled && !query.data.completedLessons.includes(selected._id) && (
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
                    {previewing ? (
                      <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : done ? (
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
                    {query.data.canAccessContent ? (
                      <>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 truncate text-sm hover:text-primary hover:underline"
                        >
                          {resource.title}
                        </a>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm">{resource.title}</span>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </>
                    )}
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
