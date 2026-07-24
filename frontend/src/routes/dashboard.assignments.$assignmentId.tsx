import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import type { AssignmentWorkspaceData, Submission } from "@/lib/learning";
import { deleteUploadedAsset, uploadToCloudinary } from "@/lib/cloudinary";

export const Route = createFileRoute("/dashboard/assignments/$assignmentId")({
  component: AssignmentWorkspacePage,
});

function AssignmentWorkspacePage() {
  const { assignmentId } = Route.useParams();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentPublicId, setAttachmentPublicId] = useState("");
  const [attachmentResourceType, setAttachmentResourceType] = useState("");
  const [pendingAttachmentPublicId, setPendingAttachmentPublicId] = useState("");
  const [grading, setGrading] = useState<Submission | null>(null);
  const [attachmentProgress, setAttachmentProgress] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["assignment-workspace", assignmentId],
    queryFn: () => apiRequest<AssignmentWorkspaceData>(`/assignments/${assignmentId}/workspace`),
    refetchInterval: 5_000,
  });
  const ownSubmission = query.data?.canManage ? undefined : query.data?.submissions[0];
  useEffect(() => {
    if (ownSubmission) {
      setContent(ownSubmission.content);
      setAttachmentUrl(ownSubmission.attachmentUrl ?? "");
      setAttachmentPublicId(ownSubmission.attachmentPublicId ?? "");
      setAttachmentResourceType(ownSubmission.attachmentResourceType ?? "");
    }
  }, [ownSubmission]);
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["assignment-workspace", assignmentId] }),
      queryClient.invalidateQueries({ queryKey: ["lms-data"] }),
    ]);
  }
  const submit = useMutation({
    mutationFn: () =>
      apiRequest(`/assignments/${assignmentId}/submissions`, {
        method: "POST",
        body: JSON.stringify({
          content,
          attachmentUrl,
          attachmentPublicId,
          attachmentResourceType,
        }),
      }),
    onSuccess: async () => {
      setPendingAttachmentPublicId("");
      await refresh();
      toast.success(ownSubmission ? "Submission updated" : "Assignment submitted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Submission failed"),
  });
  async function saveGrade(values: Record<string, string | number>) {
    if (!grading) return;
    const returning = values.action === "Returned";
    if (!returning && String(values.grade ?? "").trim() === "") {
      throw new Error("Grade is required when grading a submission");
    }
    await apiRequest(`/submissions/${grading._id}/${returning ? "return" : "grade"}`, {
      method: "PATCH",
      body: JSON.stringify({
        grade: returning ? undefined : Number(values.grade),
        feedback: values.feedback,
      }),
    });
    await refresh();
    toast.success(returning ? "Submission returned for changes" : "Grade saved");
  }
  async function uploadAttachment(file: File) {
    try {
      setAttachmentProgress(0);
      const uploaded = await uploadToCloudinary(file, "assignment", setAttachmentProgress);
      if (pendingAttachmentPublicId) {
        await deleteUploadedAsset(pendingAttachmentPublicId, "assignment").catch(() => undefined);
      }
      setAttachmentUrl(uploaded.url);
      setAttachmentPublicId(uploaded.publicId);
      setAttachmentResourceType(uploaded.resourceType);
      setPendingAttachmentPublicId(uploaded.publicId);
      toast.success("Attachment uploaded to Cloudinary");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attachment upload failed");
    } finally {
      setAttachmentProgress(null);
    }
  }
  if (query.isLoading) return <p className="text-muted-foreground">Loading assignment…</p>;
  if (query.error)
    return (
      <Card>
        <CardContent className="p-6 text-destructive">{query.error.message}</CardContent>
      </Card>
    );
  if (!query.data) return null;
  const { assignment, canManage, submissions } = query.data;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
          <Link to="/dashboard/assignments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Assignments
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">
          {assignment.course} · Due {new Date(assignment.dueDate).toLocaleDateString()} ·{" "}
          {assignment.maxScore} points
        </p>
      </div>
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-base">Assignment brief</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-7">
          {assignment.description ||
            "Follow the course instructions and submit your completed work."}
        </CardContent>
      </Card>

      {canManage ? (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base">Student submissions ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              submissions.map((submission) => {
                const student =
                  typeof submission.studentId === "string"
                    ? { name: "Student", email: "" }
                    : submission.studentId;
                return (
                  <div key={submission._id} className="rounded-lg border p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.email} · {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={submission.status === "Graded" ? "default" : "secondary"}>
                          {submission.status}
                        </Badge>
                        {submission.grade !== undefined && (
                          <Badge variant="outline">
                            {submission.grade}/{assignment.maxScore}
                          </Badge>
                        )}
                        <Button size="sm" onClick={() => setGrading(submission)}>
                          {submission.status === "Graded" ? "Update grade" : "Grade"}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm">{submission.content}</p>
                    {submission.attachmentUrl && (
                      <a
                        href={submission.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open attachment <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {submission.feedback && (
                      <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                        <span className="font-medium">Feedback:</span> {submission.feedback}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your submission</CardTitle>
              {ownSubmission && (
                <Badge variant={ownSubmission.status === "Graded" ? "default" : "secondary"}>
                  {ownSubmission.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownSubmission?.status === "Graded" && (
              <div className="rounded-lg bg-success/10 p-4">
                <p className="font-semibold text-success">
                  Grade: {ownSubmission.grade}/{assignment.maxScore}
                </p>
                {ownSubmission.feedback && <p className="text-sm mt-1">{ownSubmission.feedback}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  Submitting again will replace this attempt and return it for grading.
                </p>
              </div>
            )}
            {ownSubmission?.status === "Returned" && (
              <div className="rounded-lg bg-warning/10 p-4">
                <p className="font-semibold text-warning-foreground">Changes requested</p>
                <p className="mt-1 text-sm">
                  {ownSubmission.feedback || "Review your work and submit an updated version."}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="submission">Your answer or project notes</Label>
              <Textarea
                id="submission"
                rows={10}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Describe your work, decisions, and result…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment">Supporting link (optional)</Label>
              <Input
                id="attachment"
                type="url"
                value={attachmentUrl}
                onChange={(event) => {
                  if (pendingAttachmentPublicId) {
                    void deleteUploadedAsset(pendingAttachmentPublicId, "assignment").catch(
                      () => undefined,
                    );
                    setPendingAttachmentPublicId("");
                  }
                  setAttachmentUrl(event.target.value);
                  setAttachmentPublicId("");
                  setAttachmentResourceType("");
                }}
                placeholder="https://github.com/… or https://drive.google.com/…"
              />
              <label className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4 mr-2" />
                {attachmentProgress === null
                  ? "Upload attachment"
                  : `Uploading ${attachmentProgress}%`}
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) =>
                    event.target.files?.[0] && uploadAttachment(event.target.files[0])
                  }
                />
              </label>
            </div>
            <Button
              className="gap-2"
              disabled={!content.trim() || submit.isPending}
              onClick={() => submit.mutate()}
            >
              <Send className="h-4 w-4" />
              {submit.isPending
                ? "Submitting…"
                : ownSubmission
                  ? "Update submission"
                  : "Submit assignment"}
            </Button>
          </CardContent>
        </Card>
      )}

      <ResourceFormDialog
        open={Boolean(grading)}
        onOpenChange={(open) => !open && setGrading(null)}
        title="Review submission"
        fields={[
          {
            name: "action",
            label: "Decision",
            type: "select",
            required: true,
            options: [
              { label: "Grade submission", value: "Graded" },
              { label: "Return for changes", value: "Returned" },
            ],
          },
          {
            name: "grade",
            label: `Grade (0–${assignment.maxScore})`,
            type: "number",
          },
          { name: "feedback", label: "Feedback", type: "textarea" },
        ]}
        initialValues={
          grading
            ? {
                action: grading.status === "Returned" ? "Returned" : "Graded",
                grade: grading.grade ?? "",
                feedback: grading.feedback ?? "",
              }
            : {}
        }
        onSubmit={saveGrade}
      />
    </div>
  );
}
