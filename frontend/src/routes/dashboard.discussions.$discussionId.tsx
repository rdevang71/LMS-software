import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Send,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { useResourceCrud } from "@/hooks/use-resource-crud";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ThreadData = {
  discussion: {
    id: string;
    title: string;
    body: string;
    course: string;
    answered: boolean;
    likes: number;
    liked: boolean;
    authorId: { _id: string; name: string; avatar?: string };
    replyItems: {
      _id: string;
      authorName: string;
      authorAvatar?: string;
      body: string;
      createdAt: string;
    }[];
  };
  canManage: boolean;
  canResolve: boolean;
};
export const Route = createFileRoute("/dashboard/discussions/$discussionId")({
  component: DiscussionThreadPage,
});

function DiscussionThreadPage() {
  const { discussionId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { save, remove } = useResourceCrud();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const query = useQuery({
    queryKey: ["discussion", discussionId],
    queryFn: () => apiRequest<ThreadData>(`/discussions/${discussionId}/thread`),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["discussion", discussionId] }),
      queryClient.invalidateQueries({ queryKey: ["lms-data"] }),
    ]);
  };
  const postReply = useMutation({
    mutationFn: () =>
      apiRequest(`/discussions/${discussionId}/replies`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      }),
    onSuccess: async () => {
      setReply("");
      await refresh();
      toast.success("Reply posted");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not post reply"),
  });
  const patch = async (action: "like" | "answered") => {
    try {
      await apiRequest(`/discussions/${discussionId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };
  if (query.isLoading) return <p className="text-muted-foreground">Loading discussion…</p>;
  if (query.error)
    return (
      <Card>
        <CardContent className="p-6 text-destructive">{query.error.message}</CardContent>
      </Card>
    );
  if (!query.data) return null;
  const thread = query.data.discussion;
  const canEdit = user?.role === "admin" || user?.id === thread.authorId._id;
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
          <Link to="/dashboard/discussions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Discussions
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{thread.title}</h1>
          {thread.answered && (
            <Badge className="bg-success text-success-foreground">Answered</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">in {thread.course}</p>
      </div>
      <Card className="shadow-elegant">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={thread.authorId.avatar} />
              <AvatarFallback>{thread.authorId.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{thread.authorId.name}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{thread.body}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant={thread.liked ? "default" : "outline"}
              size="sm"
              onClick={() => patch("like")}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {thread.likes}
            </Button>
            {query.data.canResolve && (
              <Button variant="outline" size="sm" onClick={() => patch("answered")}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {thread.answered ? "Reopen" : "Mark answered"}
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={async () => {
                  const deleted = await remove("discussions", discussionId, thread.title);
                  if (deleted) navigate({ to: "/dashboard/discussions" });
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Replies ({thread.replyItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {thread.replyItems.map((item) => (
            <div key={item._id} className="flex gap-3 border-b pb-4 last:border-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={item.authorAvatar} />
                <AvatarFallback>{item.authorName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{item.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{item.body}</p>
              </div>
            </div>
          ))}
          {!thread.replyItems.length && (
            <p className="text-sm text-muted-foreground">No replies yet. Start the conversation.</p>
          )}
          <div className="space-y-2 pt-2">
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a helpful reply…"
              rows={4}
            />
            <Button
              disabled={!reply.trim() || postReply.isPending}
              onClick={() => postReply.mutate()}
            >
              <Send className="h-4 w-4 mr-2" />
              Post reply
            </Button>
          </div>
        </CardContent>
      </Card>
      <ResourceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit discussion"
        fields={[
          { name: "title", label: "Question", required: true },
          { name: "body", label: "Details", type: "textarea", required: true },
        ]}
        initialValues={{ title: thread.title, body: thread.body }}
        onSubmit={async (values) => {
          await save("discussions", discussionId, values);
          await refresh();
        }}
      />
    </div>
  );
}
