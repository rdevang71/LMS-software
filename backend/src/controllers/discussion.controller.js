import {
  Course,
  Discussion,
  Enrollment,
  Notification,
} from "../models/index.js";

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function accessThread(user, thread) {
  const course = await Course.findById(thread.courseId);
  if (!course) throw httpError(404, "Course not found");
  const canManage =
    user.role === "admin" ||
    (user.role === "instructor" && course.instructorId.toString() === user.id);
  if (!canManage && user.role === "student") {
    const enrolled = await Enrollment.exists({
      studentId: user.id,
      courseId: course.id,
      status: { $ne: "Refunded" },
    });
    if (!enrolled)
      throw httpError(403, "Enroll in this course to join its discussion");
  } else if (!canManage)
    throw httpError(403, "You cannot access this discussion");
  return { course, canManage };
}

export async function getDiscussion(request, response, next) {
  try {
    const thread = await Discussion.findById(request.params.discussionId)
      .populate("authorId", "name avatar email")
      .lean();
    if (!thread)
      return response.status(404).json({ message: "Discussion not found" });
    const { course, canManage } = await accessThread(request.user, thread);
    response.json({
      discussion: {
        ...thread,
        id: thread._id.toString(),
        course: course.title,
        liked: thread.likedBy.some(
          (userId) => userId.toString() === request.user.id,
        ),
      },
      canManage,
      canResolve:
        canManage || thread.authorId._id.toString() === request.user.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function addReply(request, response, next) {
  try {
    const thread = await Discussion.findById(request.params.discussionId);
    if (!thread)
      return response.status(404).json({ message: "Discussion not found" });
    await accessThread(request.user, thread);
    if (!request.body.body?.trim())
      return response.status(400).json({ message: "Reply is required" });
    thread.replyItems.push({
      authorId: request.user.id,
      authorName: request.user.name,
      authorAvatar: request.user.avatar,
      body: request.body.body,
    });
    thread.replies = thread.replyItems.length;
    await thread.save();
    if (thread.authorId.toString() !== request.user.id) {
      await Notification.create({
        userId: thread.authorId,
        title: "New discussion reply",
        body: `${request.user.name} replied to “${thread.title}”.`,
      });
    }
    response.status(201).json({ reply: thread.replyItems.at(-1) });
  } catch (error) {
    next(error);
  }
}

export async function toggleLike(request, response, next) {
  try {
    const thread = await Discussion.findById(request.params.discussionId);
    if (!thread)
      return response.status(404).json({ message: "Discussion not found" });
    await accessThread(request.user, thread);
    const index = thread.likedBy.findIndex(
      (userId) => userId.toString() === request.user.id,
    );
    if (index >= 0) thread.likedBy.splice(index, 1);
    else thread.likedBy.push(request.user.id);
    thread.likes = thread.likedBy.length;
    await thread.save();
    response.json({ liked: index < 0, likes: thread.likes });
  } catch (error) {
    next(error);
  }
}

export async function toggleAnswered(request, response, next) {
  try {
    const thread = await Discussion.findById(request.params.discussionId);
    if (!thread)
      return response.status(404).json({ message: "Discussion not found" });
    const { canManage } = await accessThread(request.user, thread);
    const ownsThread = thread.authorId.toString() === request.user.id;
    if (!canManage && !ownsThread)
      throw httpError(
        403,
        "Only the author or course instructor can change answer status",
      );
    thread.answered =
      request.body.answered === undefined
        ? !thread.answered
        : Boolean(request.body.answered);
    await thread.save();
    response.json({ answered: thread.answered });
  } catch (error) {
    next(error);
  }
}
