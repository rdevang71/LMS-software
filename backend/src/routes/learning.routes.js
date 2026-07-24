import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  addCourseResource,
  addLesson,
  addQuizQuestion,
  completeLesson,
  deleteCourseResource,
  deleteLesson,
  deleteQuizQuestion,
  getAssignmentWorkspace,
  getCoursePlayer,
  getQuizAttempts,
  getQuizRunner,
  gradeSubmission,
  returnSubmission,
  submitAssignment,
  submitQuiz,
  updateLesson,
  updateQuizQuestion,
} from "../controllers/learning.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/courses/:courseId/player", getCoursePlayer);
router.post("/courses/:courseId/lessons", addLesson);
router.patch("/courses/:courseId/lessons/:lessonId", updateLesson);
router.delete("/courses/:courseId/lessons/:lessonId", deleteLesson);
router.patch("/courses/:courseId/lessons/:lessonId/complete", completeLesson);
router.post("/courses/:courseId/resources", addCourseResource);
router.delete("/courses/:courseId/resources/:resourceId", deleteCourseResource);

router.get("/quizzes/:quizId/runner", getQuizRunner);
router.get("/quizzes/:quizId/attempts", getQuizAttempts);
router.post("/quizzes/:quizId/questions", addQuizQuestion);
router.patch("/quizzes/:quizId/questions/:questionId", updateQuizQuestion);
router.delete("/quizzes/:quizId/questions/:questionId", deleteQuizQuestion);
router.post("/quizzes/:quizId/submit", submitQuiz);

router.get("/assignments/:assignmentId/workspace", getAssignmentWorkspace);
router.post("/assignments/:assignmentId/submissions", submitAssignment);
router.patch("/submissions/:submissionId/grade", gradeSubmission);
router.patch("/submissions/:submissionId/return", returnSubmission);

export default router;
