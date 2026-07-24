import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import type { QuizAttempt, QuizQuestion, QuizResult, QuizRunnerData } from "@/lib/learning";

export const Route = createFileRoute("/dashboard/quizzes/$quizId")({ component: QuizRunnerPage });

function QuizRunnerPage() {
  const { quizId } = Route.useParams();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult["attempt"] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuizQuestion | null>(null);
  const query = useQuery({
    queryKey: ["quiz-runner", quizId],
    queryFn: () => apiRequest<QuizRunnerData>(`/quizzes/${quizId}/runner`),
  });
  const attemptsQuery = useQuery({
    queryKey: ["quiz-attempts", quizId],
    queryFn: () => apiRequest<{ attempts: QuizAttempt[] }>(`/quizzes/${quizId}/attempts`),
    enabled: Boolean(query.data?.canManage),
  });
  const submit = useMutation({
    mutationFn: () =>
      apiRequest<QuizResult>(`/quizzes/${quizId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: query.data?.quiz.questionItems.map((_, index) => answers[index] ?? -1),
        }),
      }),
    onSuccess: async (data) => {
      setResult(data.attempt);
      await queryClient.invalidateQueries({ queryKey: ["lms-data"] });
      toast.success(`Quiz submitted: ${data.attempt.score}%`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Quiz submission failed"),
  });
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["quiz-runner", quizId] }),
      queryClient.invalidateQueries({ queryKey: ["lms-data"] }),
    ]);
  }
  async function saveQuestion(values: Record<string, string | number>) {
    const options = [values.option1, values.option2, values.option3, values.option4]
      .map(String)
      .filter(Boolean);
    const payload = {
      question: values.question,
      options,
      correctAnswer: Number(values.correctAnswer),
      explanation: values.explanation,
      points: Number(values.points),
    };
    await apiRequest(
      editing ? `/quizzes/${quizId}/questions/${editing._id}` : `/quizzes/${quizId}/questions`,
      { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
    await refresh();
    toast.success(editing ? "Question updated" : "Question added");
  }
  async function removeQuestion(question: QuizQuestion) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await apiRequest(`/quizzes/${quizId}/questions/${question._id}`, { method: "DELETE" });
      await refresh();
      toast.success("Question deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete question");
    }
  }
  if (query.isLoading) return <p className="text-muted-foreground">Loading quiz…</p>;
  if (query.error)
    return (
      <Card>
        <CardContent className="p-6 text-destructive">{query.error.message}</CardContent>
      </Card>
    );
  if (!query.data) return null;
  const questions = query.data.quiz.questionItems;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/dashboard/quizzes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quizzes
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{query.data.quiz.title}</h1>
          <p className="text-sm text-muted-foreground">
            {query.data.quiz.course} · {query.data.quiz.duration}
          </p>
        </div>
        {query.data.canManage && (
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add question
          </Button>
        )}
      </div>

      {!questions.length ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No questions have been added yet.
          </CardContent>
        </Card>
      ) : (
        questions.map((question, questionIndex) => {
          const outcome = result?.results[questionIndex];
          return (
            <Card
              key={question._id}
              className={
                outcome ? (outcome.isCorrect ? "border-success" : "border-destructive") : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base leading-6">
                    {questionIndex + 1}. {question.question}
                  </CardTitle>
                  <Badge variant="secondary">{question.points} pt</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer ${answers[questionIndex] === optionIndex ? "border-primary bg-primary/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionIndex}`}
                      checked={answers[questionIndex] === optionIndex}
                      disabled={Boolean(result) || query.data.canManage}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))
                      }
                    />
                    <span>{option}</span>
                    {query.data.canManage && question.correctAnswer === optionIndex && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
                    )}
                  </label>
                ))}
                {outcome && (
                  <div
                    className={`mt-3 rounded-lg p-3 text-sm ${outcome.isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {outcome.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {outcome.isCorrect
                        ? "Correct"
                        : `Correct answer: ${question.options[outcome.correctAnswer]}`}
                    </div>
                    {outcome.explanation && (
                      <p className="mt-1 opacity-90">{outcome.explanation}</p>
                    )}
                  </div>
                )}
                {query.data.canManage && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(question);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeQuestion(question)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
      {!query.data.canManage && questions.length > 0 && (
        <Card className="sticky bottom-4 shadow-elegant-lg">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            {result ? (
              <div>
                <p className="font-semibold">Score: {result.score}%</p>
                <p className="text-sm text-muted-foreground">
                  {result.correct} of {result.total} correct
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Answered {Object.keys(answers).length} of {questions.length}
              </p>
            )}
            <Button
              disabled={
                submit.isPending ||
                Boolean(result) ||
                Object.keys(answers).length !== questions.length
              }
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Submitting…" : result ? "Submitted" : "Submit quiz"}
            </Button>
          </CardContent>
        </Card>
      )}
      {query.data.canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent attempts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attemptsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading attempts...</p>
            ) : attemptsQuery.data?.attempts.length ? (
              attemptsQuery.data.attempts.slice(0, 20).map((attempt) => (
                <div
                  key={attempt._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{attempt.studentId.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{attempt.score}%</p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.correct}/{attempt.total} correct
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No attempts yet.</p>
            )}
          </CardContent>
        </Card>
      )}
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit question" : "Add question"}
        fields={[
          { name: "question", label: "Question", type: "textarea", required: true },
          { name: "option1", label: "Option 1", required: true },
          { name: "option2", label: "Option 2", required: true },
          { name: "option3", label: "Option 3", required: true },
          { name: "option4", label: "Option 4", required: true },
          {
            name: "correctAnswer",
            label: "Correct option",
            type: "select",
            required: true,
            options: [0, 1, 2, 3].map((value) => ({
              label: `Option ${value + 1}`,
              value: String(value),
            })),
          },
          { name: "explanation", label: "Answer explanation", type: "textarea" },
          { name: "points", label: "Points", type: "number", required: true },
        ]}
        initialValues={
          editing
            ? {
                question: editing.question,
                option1: editing.options[0] ?? "",
                option2: editing.options[1] ?? "",
                option3: editing.options[2] ?? "",
                option4: editing.options[3] ?? "",
                correctAnswer: editing.correctAnswer ?? 0,
                explanation: editing.explanation ?? "",
                points: editing.points,
              }
            : {
                question: "",
                option1: "",
                option2: "",
                option3: "",
                option4: "",
                correctAnswer: 0,
                explanation: "",
                points: 1,
              }
        }
        onSubmit={saveQuestion}
      />
    </div>
  );
}
