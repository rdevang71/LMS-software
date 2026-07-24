import {
  Assignment,
  Course,
  Enrollment,
  Notification,
  Quiz,
  QuizAttempt,
  Submission,
} from "../models/index.js";
import {
  deleteCloudinaryAsset,
  isOwnedCloudinaryAsset,
} from "../config/cloudinary.js";

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

async function canManageCourse(user, course) {
  return (
    Boolean(course) &&
    (user.role === "admin" ||
      (user.role === "instructor" &&
        course.instructorId.toString() === user.id))
  );
}

async function requireCourseAccess(user, course) {
  if (!course) {
    const error = new Error("Course not found");
    error.status = 404;
    throw error;
  }
  if (await canManageCourse(user, course)) return null;
  if (user.role !== "student") throw forbidden("You cannot access this course");
  const enrollment = await Enrollment.findOne({
    studentId: user.id,
    courseId: course._id ?? course.id,
    status: { $ne: "Refunded" },
  });
  if (!enrollment)
    throw forbidden("Enroll in this course to access its lessons");
  return enrollment;
}

function requireAssignmentAudienceAccess(user, assignment) {
  if (
    user.role === "student" &&
    assignment.audience === "Selected students" &&
    !assignment.assignedStudentIds?.some(
      (studentId) => studentId.toString() === user.id,
    )
  ) {
    throw forbidden("This assignment is not assigned to you");
  }
}

function questionIsValid(payload, existing) {
  const options = payload.options ?? existing?.options ?? [];
  const correctAnswer = Number(
    payload.correctAnswer ?? existing?.correctAnswer,
  );
  return (
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every((option) => typeof option === "string" && option.trim()) &&
    Number.isInteger(correctAnswer) &&
    correctAnswer >= 0 &&
    correctAnswer < options.length
  );
}

export async function getCoursePlayer(request, response, next) {
  try {
    const course = await Course.findById(request.params.courseId).lean();
    if (!course)
      return response.status(404).json({ message: "Course not found" });
    const enrollment = await requireCourseAccess(request.user, course);
    response.json({
      course: {
        ...course,
        id: course._id.toString(),
        instructorId: course.instructorId.toString(),
      },
      progress: enrollment?.progress ?? 0,
      completedLessons: enrollment?.completedLessons?.map(String) ?? [],
      canManage: await canManageCourse(request.user, course),
    });
  } catch (error) {
    next(error);
  }
}

export async function addLesson(request, response, next) {
  try {
    const course = await Course.findById(request.params.courseId);
    if (!course)
      return response.status(404).json({ message: "Course not found" });
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit your own course content");
    if (
      !isOwnedCloudinaryAsset(
        request.body.videoPublicId,
        "lecture",
        request.user.id,
      )
    ) {
      return response.status(400).json({ message: "Invalid lecture upload" });
    }
    course.courseContent.push({
      ...request.body,
      order: request.body.order ?? course.courseContent.length + 1,
    });
    course.lessons = course.courseContent.length;
    await course.save();
    const enrollments = await Enrollment.find({ courseId: course.id });
    for (const enrollment of enrollments) {
      enrollment.progress = Math.round(
        (enrollment.completedLessons.length / course.courseContent.length) *
          100,
      );
      await enrollment.save();
    }
    const studentIds = await Enrollment.find({
      courseId: course.id,
      status: { $ne: "Refunded" },
    }).distinct("studentId");
    if (studentIds.length) {
      await Notification.insertMany(
        studentIds.map((studentId) => ({
          userId: studentId,
          title: "New course lesson",
          body: `${course.courseContent.at(-1).title} was added to ${course.title}.`,
        })),
      );
    }
    response.status(201).json({ lesson: course.courseContent.at(-1) });
  } catch (error) {
    next(error);
  }
}

export async function updateLesson(request, response, next) {
  try {
    const course = await Course.findById(request.params.courseId);
    if (!course)
      return response.status(404).json({ message: "Course not found" });
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit your own course content");
    const lesson = course.courseContent.id(request.params.lessonId);
    if (!lesson)
      return response.status(404).json({ message: "Lesson not found" });
    if (
      !isOwnedCloudinaryAsset(
        request.body.videoPublicId,
        "lecture",
        request.user.id,
      )
    ) {
      return response.status(400).json({ message: "Invalid lecture upload" });
    }
    const previousVideoPublicId = lesson.videoPublicId;
    [
      "title",
      "description",
      "videoUrl",
      "videoPublicId",
      "duration",
      "content",
      "order",
    ].forEach((field) => {
      if (request.body[field] !== undefined)
        lesson[field] = request.body[field];
    });
    await course.save();
    if (
      request.body.videoPublicId &&
      previousVideoPublicId &&
      request.body.videoPublicId !== previousVideoPublicId
    ) {
      await deleteCloudinaryAsset(previousVideoPublicId, "video");
    }
    response.json({ lesson });
  } catch (error) {
    next(error);
  }
}

export async function deleteLesson(request, response, next) {
  try {
    const course = await Course.findById(request.params.courseId);
    if (!course)
      return response.status(404).json({ message: "Course not found" });
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit your own course content");
    const lesson = course.courseContent.id(request.params.lessonId);
    if (!lesson)
      return response.status(404).json({ message: "Lesson not found" });
    const videoPublicId = lesson.videoPublicId;
    lesson.deleteOne();
    course.lessons = course.courseContent.length;
    await course.save();
    const enrollments = await Enrollment.find({ courseId: course.id });
    for (const enrollment of enrollments) {
      enrollment.completedLessons = enrollment.completedLessons.filter(
        (lessonId) => lessonId.toString() !== request.params.lessonId,
      );
      enrollment.progress = course.courseContent.length
        ? Math.round(
            (enrollment.completedLessons.length / course.courseContent.length) *
              100,
          )
        : 0;
      await enrollment.save();
    }
    await deleteCloudinaryAsset(videoPublicId, "video");
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function addCourseResource(request, response, next) {
  try {
    const course = await Course.findById(request.params.courseId);
    if (!course)
      return response.status(404).json({ message: "Course not found" });
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit resources for your courses");
    if (!request.body.title?.trim() || !request.body.url?.trim())
      return response
        .status(400)
        .json({ message: "Resource title and URL are required" });
    if (
      !isOwnedCloudinaryAsset(
        request.body.publicId,
        "resource",
        request.user.id,
      )
    ) {
      return response
        .status(400)
        .json({ message: "Invalid course resource upload" });
    }
    course.resources.push({
      title: request.body.title,
      url: request.body.url,
      type: request.body.type ?? "link",
      publicId: request.body.publicId ?? "",
      resourceType: request.body.resourceType ?? "",
    });
    await course.save();
    response.status(201).json({ resource: course.resources.at(-1) });
  } catch (error) {
    next(error);
  }
}

export async function deleteCourseResource(request, response, next) {
  try {
    const course = await Course.findById(request.params.courseId);
    if (!course)
      return response.status(404).json({ message: "Course not found" });
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit resources for your courses");
    const resource = course.resources.id(request.params.resourceId);
    if (!resource)
      return response.status(404).json({ message: "Resource not found" });
    const { publicId, resourceType } = resource;
    resource.deleteOne();
    await course.save();
    await deleteCloudinaryAsset(publicId, resourceType || "raw");
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function completeLesson(request, response, next) {
  try {
    if (request.user.role !== "student")
      throw forbidden("Only students track lesson progress");
    const course = await Course.findById(request.params.courseId);
    if (!course?.courseContent.id(request.params.lessonId))
      return response.status(404).json({ message: "Lesson not found" });
    const enrollment = await Enrollment.findOne({
      studentId: request.user.id,
      courseId: course.id,
      status: { $ne: "Refunded" },
    });
    if (!enrollment) throw forbidden("Enroll in this course first");
    if (
      !enrollment.completedLessons.some(
        (lessonId) => lessonId.toString() === request.params.lessonId,
      )
    ) {
      enrollment.completedLessons.push(request.params.lessonId);
    }
    enrollment.progress = course.courseContent.length
      ? Math.round(
          (enrollment.completedLessons.length / course.courseContent.length) *
            100,
        )
      : 0;
    await enrollment.save();
    response.json({
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons.map(String),
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizRunner(request, response, next) {
  try {
    const quiz = await Quiz.findById(request.params.quizId).lean();
    if (!quiz) return response.status(404).json({ message: "Quiz not found" });
    const course = await Course.findById(quiz.courseId);
    await requireCourseAccess(request.user, course);
    const canManage = await canManageCourse(request.user, course);
    const questions = quiz.questionItems.map((item) =>
      canManage
        ? item
        : {
            _id: item._id,
            question: item.question,
            options: item.options,
            points: item.points,
          },
    );
    response.json({
      quiz: { ...quiz, id: quiz._id.toString(), questionItems: questions },
      canManage,
    });
  } catch (error) {
    next(error);
  }
}

export async function addQuizQuestion(request, response, next) {
  try {
    const quiz = await Quiz.findById(request.params.quizId);
    if (!quiz) return response.status(404).json({ message: "Quiz not found" });
    const course = await Course.findById(quiz.courseId);
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit quizzes for your courses");
    if (!questionIsValid(request.body))
      return response.status(400).json({
        message: "Provide at least two options and a valid correct answer",
      });
    quiz.questionItems.push(request.body);
    quiz.questions = quiz.questionItems.length;
    await quiz.save();
    response.status(201).json({ question: quiz.questionItems.at(-1) });
  } catch (error) {
    next(error);
  }
}

export async function updateQuizQuestion(request, response, next) {
  try {
    const quiz = await Quiz.findById(request.params.quizId);
    if (!quiz) return response.status(404).json({ message: "Quiz not found" });
    const course = await Course.findById(quiz.courseId);
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit quizzes for your courses");
    const question = quiz.questionItems.id(request.params.questionId);
    if (!question)
      return response.status(404).json({ message: "Question not found" });
    if (!questionIsValid(request.body, question))
      return response.status(400).json({
        message: "Provide at least two options and a valid correct answer",
      });
    ["question", "options", "correctAnswer", "explanation", "points"].forEach(
      (field) => {
        if (request.body[field] !== undefined)
          question[field] = request.body[field];
      },
    );
    await quiz.save();
    response.json({ question });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuizQuestion(request, response, next) {
  try {
    const quiz = await Quiz.findById(request.params.quizId);
    if (!quiz) return response.status(404).json({ message: "Quiz not found" });
    const course = await Course.findById(quiz.courseId);
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only edit quizzes for your courses");
    const question = quiz.questionItems.id(request.params.questionId);
    if (!question)
      return response.status(404).json({ message: "Question not found" });
    question.deleteOne();
    quiz.questions = quiz.questionItems.length;
    await quiz.save();
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function submitQuiz(request, response, next) {
  try {
    if (request.user.role !== "student")
      throw forbidden("Only students can submit quiz attempts");
    const quiz = await Quiz.findById(request.params.quizId);
    if (!quiz) return response.status(404).json({ message: "Quiz not found" });
    const course = await Course.findById(quiz.courseId);
    await requireCourseAccess(request.user, course);
    if (!quiz.questionItems.length)
      return response
        .status(400)
        .json({ message: "This quiz has no questions yet" });
    const answers = Array.isArray(request.body.answers)
      ? request.body.answers.map(Number)
      : [];
    let earned = 0;
    let totalPoints = 0;
    let correct = 0;
    const results = quiz.questionItems.map((question, index) => {
      totalPoints += question.points;
      const isCorrect = answers[index] === question.correctAnswer;
      if (isCorrect) {
        earned += question.points;
        correct += 1;
      }
      return {
        questionId: question.id,
        answer: answers[index],
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      };
    });
    const score = totalPoints ? Math.round((earned / totalPoints) * 100) : 0;
    const attempt = await QuizAttempt.create({
      quizId: quiz.id,
      studentId: request.user.id,
      answers,
      score,
      correct,
      total: quiz.questionItems.length,
    });
    quiz.avgScore = Math.round(
      (quiz.avgScore * quiz.attempts + score) / (quiz.attempts + 1),
    );
    quiz.attempts += 1;
    await quiz.save();
    response.status(201).json({
      attempt: {
        id: attempt.id,
        score,
        correct,
        total: quiz.questionItems.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizAttempts(request, response, next) {
  try {
    const quiz = await Quiz.findById(request.params.quizId);
    if (!quiz) return response.status(404).json({ message: "Quiz not found" });
    const course = await Course.findById(quiz.courseId);
    await requireCourseAccess(request.user, course);
    const canManage = await canManageCourse(request.user, course);
    const filter = canManage
      ? { quizId: quiz.id }
      : { quizId: quiz.id, studentId: request.user.id };
    const attempts = await QuizAttempt.find(filter)
      .populate("studentId", "name email avatar")
      .sort({ createdAt: -1 });
    response.json({ attempts });
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentWorkspace(request, response, next) {
  try {
    const assignment = await Assignment.findById(
      request.params.assignmentId,
    ).lean();
    if (!assignment)
      return response.status(404).json({ message: "Assignment not found" });
    const course = await Course.findById(assignment.courseId);
    await requireCourseAccess(request.user, course);
    requireAssignmentAudienceAccess(request.user, assignment);
    const canManage = await canManageCourse(request.user, course);
    const submissions = canManage
      ? await Submission.find({ assignmentId: assignment._id })
          .populate("studentId", "name email avatar")
          .sort({ submittedAt: -1 })
      : await Submission.find({
          assignmentId: assignment._id,
          studentId: request.user.id,
        });
    response.json({
      assignment: {
        ...assignment,
        id: assignment._id.toString(),
        courseId: assignment.courseId.toString(),
      },
      submissions,
      canManage,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitAssignment(request, response, next) {
  try {
    if (request.user.role !== "student")
      throw forbidden("Only students can submit assignments");
    const assignment = await Assignment.findById(request.params.assignmentId);
    if (!assignment)
      return response.status(404).json({ message: "Assignment not found" });
    const course = await Course.findById(assignment.courseId);
    await requireCourseAccess(request.user, course);
    requireAssignmentAudienceAccess(request.user, assignment);
    if (!request.body.content?.trim())
      return response
        .status(400)
        .json({ message: "Submission content is required" });
    if (
      !isOwnedCloudinaryAsset(
        request.body.attachmentPublicId,
        "assignment",
        request.user.id,
      )
    ) {
      return response
        .status(400)
        .json({ message: "Invalid assignment upload" });
    }
    const existing = await Submission.findOne({
      assignmentId: assignment.id,
      studentId: request.user.id,
    });
    const submission = await Submission.findOneAndUpdate(
      { assignmentId: assignment.id, studentId: request.user.id },
      {
        content: request.body.content,
        attachmentUrl: request.body.attachmentUrl ?? "",
        attachmentPublicId: request.body.attachmentPublicId ?? "",
        attachmentResourceType: request.body.attachmentResourceType ?? "",
        status: "Submitted",
        submittedAt: new Date(),
        $unset: { grade: 1, feedback: 1 },
      },
      { upsert: true, new: true, runValidators: true },
    );
    if (!existing) {
      assignment.submissions += 1;
      await assignment.save();
    }
    if (
      existing?.attachmentPublicId &&
      request.body.attachmentPublicId !== existing.attachmentPublicId
    ) {
      await deleteCloudinaryAsset(
        existing.attachmentPublicId,
        existing.attachmentResourceType || "raw",
      );
    }
    response.status(existing ? 200 : 201).json({ submission });
  } catch (error) {
    next(error);
  }
}

export async function gradeSubmission(request, response, next) {
  try {
    const submission = await Submission.findById(
      request.params.submissionId,
    ).populate("assignmentId");
    if (!submission)
      return response.status(404).json({ message: "Submission not found" });
    const course = await Course.findById(submission.assignmentId.courseId);
    if (!(await canManageCourse(request.user, course)))
      throw forbidden("You can only grade submissions for your courses");
    const grade = Number(request.body.grade);
    if (
      !Number.isFinite(grade) ||
      grade < 0 ||
      grade > submission.assignmentId.maxScore
    ) {
      return response.status(400).json({
        message: `Grade must be between 0 and ${submission.assignmentId.maxScore}`,
      });
    }
    submission.grade = grade;
    submission.feedback = request.body.feedback ?? "";
    submission.status = "Graded";
    await submission.save();
    await Notification.create({
      userId: submission.studentId,
      title: "Assignment graded",
      body: `${submission.assignmentId.title} was graded ${grade}/${submission.assignmentId.maxScore}.`,
    });
    response.json({ submission });
  } catch (error) {
    next(error);
  }
}

export async function returnSubmission(request, response, next) {
  try {
    const submission = await Submission.findById(
      request.params.submissionId,
    ).populate("assignmentId");
    if (!submission)
      return response.status(404).json({ message: "Submission not found" });
    const course = await Course.findById(submission.assignmentId.courseId);
    if (!(await canManageCourse(request.user, course))) {
      throw forbidden("You can only review submissions for your courses");
    }
    submission.grade = undefined;
    submission.feedback = request.body.feedback ?? "";
    submission.status = "Returned";
    await submission.save();
    await Notification.create({
      userId: submission.studentId,
      title: "Assignment returned",
      body: `${submission.assignmentId.title} needs changes. Review the instructor feedback.`,
    });
    response.json({ submission });
  } catch (error) {
    next(error);
  }
}
