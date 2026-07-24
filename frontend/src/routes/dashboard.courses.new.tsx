import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { useLmsData, type Course, type LmsData } from "@/lib/lms-data";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { deleteUploadedAsset, uploadToCloudinary, type UploadPurpose } from "@/lib/cloudinary";

export const Route = createFileRoute("/dashboard/courses/new")({ component: NewCoursePage });

function NewCoursePage() {
  const {
    data: { categories, instructors },
  } = useLmsData();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "Beginner",
    price: "0",
    duration: "",
    outcomes: "",
    instructorId: "",
    status: "Draft",
  });
  const [busy, setBusy] = useState(false);
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPublicId, setThumbnailPublicId] = useState("");
  const [resources, setResources] = useState<
    { title: string; url: string; type: string; publicId: string; resourceType: string }[]
  >([]);
  const [uploading, setUploading] = useState<{ purpose: UploadPurpose; progress: number } | null>(
    null,
  );
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function saveCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.category ||
      !form.duration.trim() ||
      (user?.role === "admin" && !form.instructorId)
    )
      return toast.error("Title, description, category, duration, and instructor are required");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid course price");
    setBusy(true);
    try {
      const result = await apiRequest<{ course: Course }>("/courses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          duration: form.duration.trim(),
          price,
          outcomes: form.outcomes
            .split("\n")
            .map((outcome) => outcome.trim())
            .filter(Boolean),
          thumbnail: thumbnail || undefined,
          thumbnailPublicId,
          resources,
        }),
      });
      queryClient.setQueryData<LmsData>(["lms-data"], (current) => {
        if (!current) return current;
        const includeInMine = user?.role === "admin" || user?.role === "instructor";
        return {
          ...current,
          courses: [
            result.course,
            ...current.courses.filter((course) => course.id !== result.course.id),
          ],
          myCourses: includeInMine
            ? [
                result.course,
                ...current.myCourses.filter((course) => course.id !== result.course.id),
              ]
            : current.myCourses,
          stats: { ...current.stats, totalCourses: current.stats.totalCourses + 1 },
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["lms-data"] });
      toast.success(form.status === "Published" ? "Course published" : "Course draft saved");
      await navigate({ to: "/dashboard/courses" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save course");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file: File, purpose: "thumbnail" | "resource") {
    if (purpose === "resource" && resources.length >= 4)
      return toast.error("A course can include up to 4 uploaded resources");
    try {
      setUploading({ purpose, progress: 0 });
      const uploaded = await uploadToCloudinary(file, purpose, (progress) =>
        setUploading({ purpose, progress }),
      );
      if (purpose === "thumbnail") {
        if (thumbnailPublicId) {
          await deleteUploadedAsset(thumbnailPublicId, "thumbnail").catch(() =>
            toast.error("The previous thumbnail could not be removed from Cloudinary"),
          );
        }
        setThumbnail(uploaded.url);
        setThumbnailPublicId(uploaded.publicId);
      } else
        setResources((current) => [
          ...current,
          {
            title: file.name,
            url: uploaded.url,
            type: file.type || uploaded.resourceType,
            publicId: uploaded.publicId,
            resourceType: uploaded.resourceType,
          },
        ]);
      toast.success(`${purpose === "thumbnail" ? "Thumbnail" : "Resource"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function cancelCourse() {
    setBusy(true);
    await Promise.allSettled([
      deleteUploadedAsset(thumbnailPublicId, "thumbnail"),
      ...resources.map((resource) => deleteUploadedAsset(resource.publicId, "resource")),
    ]);
    await navigate({ to: "/dashboard/courses" });
  }
  return (
    <div>
      <PageHeader title="Create Course" description="Set up a new course to publish." />
      <form className="grid gap-4 lg:grid-cols-3" onSubmit={saveCourse}>
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-title">Course title</Label>
              <Input
                id="course-title"
                required
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="e.g. Advanced React Patterns"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                required
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={4}
                placeholder="What will students learn?"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => update("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(value) => update("level", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {user?.role === "admin" && (
                <div className="space-y-1.5">
                  <Label>Instructor</Label>
                  <Select
                    value={form.instructorId}
                    onValueChange={(value) => update("instructorId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) => update("price", event.target.value)}
                  placeholder="99"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input
                  required
                  value={form.duration}
                  onChange={(event) => update("duration", event.target.value)}
                  placeholder="12h 30m"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Publication status</Label>
                <Select value={form.status} onValueChange={(value) => update("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Learning outcomes</Label>
              <Textarea
                value={form.outcomes}
                onChange={(event) => update("outcomes", event.target.value)}
                rows={3}
                placeholder="One outcome per line"
              />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-muted/40 cursor-pointer transition-colors overflow-hidden">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="Course thumbnail preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {uploading?.purpose === "thumbnail"
                        ? `Uploading ${uploading.progress}%`
                        : "Choose PNG or JPG (max 5MB)"}
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) =>
                    event.target.files?.[0] && uploadFile(event.target.files[0], "thumbnail")
                  }
                />
              </label>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="inline-flex w-full h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4 mr-2" />
                {uploading?.purpose === "resource"
                  ? `Uploading ${uploading.progress}%`
                  : "Upload PDF or file"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) =>
                    event.target.files?.[0] && uploadFile(event.target.files[0], "resource")
                  }
                />
              </label>
              <div className="mt-3 space-y-2">
                {resources.map((resource, index) => (
                  <div
                    key={`${resource.title}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="flex-1 truncate">{resource.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        void deleteUploadedAsset(resource.publicId, "resource").catch(() =>
                          toast.error("The uploaded resource could not be removed from Cloudinary"),
                        );
                        setResources((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        );
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || Boolean(uploading)}
              onClick={cancelCourse}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || Boolean(uploading) || !categories.length}
              className="bg-gradient-primary shadow-glow"
            >
              {busy ? "Creating..." : form.status === "Published" ? "Publish course" : "Save draft"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
