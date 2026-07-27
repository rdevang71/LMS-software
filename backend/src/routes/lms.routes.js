import { Router } from "express";
import bcrypt from "bcryptjs";
import { allowRoles, requireAuth } from "../middleware/auth.js";
import {
  Announcement,
  Assignment,
  Category,
  Certificate,
  Course,
  Discussion,
  Enrollment,
  Notification,
  Quiz,
  QuizAttempt,
  Submission,
  User,
} from "../models/index.js";
import {
  deleteCloudinaryAsset,
  isOwnedCloudinaryAsset,
} from "../config/cloudinary.js";
import {
  certificateAchievement,
  certificateMarksError,
} from "../utils/certificate.js";

const router = Router();
router.use(requireAuth);

const dateOnly = (date) => new Date(date).toISOString().slice(0, 10);
const id = (document) => document._id.toString();

function paymentValidationMessage({ amount, paidAmount, status }) {
  if (!Number.isFinite(amount) || amount < 0)
    return "Total fee must be zero or more";
  if (!Number.isFinite(paidAmount) || paidAmount < 0)
    return "Fee paid must be zero or more";
  if (paidAmount > amount)
    return "Fee paid cannot be greater than the total fee";
  if (status === "Paid" && paidAmount !== amount)
    return "A paid enrollment must have the full fee recorded as paid";
  if (status === "Partially Paid" && (paidAmount <= 0 || paidAmount >= amount))
    return "A partially paid enrollment needs a payment between zero and the total fee";
  if (status === "Pending" && paidAmount !== 0)
    return "Use Partially Paid when some of the fee has been paid";
  if (status === "Free" && (amount !== 0 || paidAmount !== 0))
    return "A free enrollment must have a zero total fee and zero fee paid";
  return null;
}

async function buildSnapshot(user) {
  const [
    categories,
    courses,
    studentsRaw,
    instructorsRaw,
    enrollmentsRaw,
    assignmentsRaw,
    quizzesRaw,
    certificatesRaw,
    announcementsRaw,
    notificationsRaw,
    discussionsRaw,
    studentSubmissionsRaw,
    studentAttemptsRaw,
  ] = await Promise.all([
    Category.find().sort("name").lean(),
    Course.find().sort({ createdAt: -1 }).lean(),
    User.find({ role: "student" }).lean(),
    User.find({ role: "instructor" }).lean(),
    Enrollment.find()
      .populate("studentId courseId")
      .sort({ createdAt: -1 })
      .lean(),
    Assignment.find().sort("dueDate").lean(),
    Quiz.find().lean(),
    Certificate.find().sort({ issued: -1 }).lean(),
    Announcement.find().sort({ createdAt: -1 }).lean(),
    Notification.find({ $or: [{ userId: user.id }, { userId: null }] })
      .sort({ createdAt: -1 })
      .lean(),
    Discussion.find()
      .populate("authorId courseId")
      .sort({ createdAt: -1 })
      .lean(),
    user.role === "student"
      ? Submission.find({ studentId: user.id }).lean()
      : [],
    user.role === "student"
      ? QuizAttempt.find({ studentId: user.id }).lean()
      : [],
  ]);

  const enrollments = enrollmentsRaw
    .filter((entry) => entry.studentId && entry.courseId)
    .map((entry) => ({
      id: id(entry),
      student: entry.studentId.name,
      studentId: id(entry.studentId),
      studentAvatar: entry.studentId.avatar,
      course: entry.courseId.title,
      courseId: id(entry.courseId),
      date: dateOnly(entry.createdAt),
      amount: entry.amount,
      paidAmount:
        entry.paidAmount ?? (entry.status === "Paid" ? entry.amount : 0),
      paymentMethod:
        entry.paymentMethod ??
        (entry.status === "Free" ? "Not applicable" : "Other"),
      status: entry.status,
      progress: entry.progress,
    }));
  const coursesOut = courses.map(
    ({ courseContent: _courseContent, resources: _resources, ...course }) => {
      const courseEnrollments = enrollments.filter(
        (entry) => entry.courseId === id(course) && entry.status !== "Refunded",
      );
      return {
        ...course,
        id: id(course),
        instructorId: course.instructorId.toString(),
        completionRate: courseEnrollments.length
          ? Math.round(
              courseEnrollments.reduce(
                (sum, entry) => sum + entry.progress,
                0,
              ) / courseEnrollments.length,
            )
          : 0,
        _id: undefined,
      };
    },
  );
  const students = studentsRaw.map((student) => {
    const mine = enrollments.filter(
      (entry) => entry.studentId === id(student) && entry.status !== "Refunded",
    );
    return {
      id: id(student),
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      enrolled: mine.length,
      completed: mine.filter((entry) => entry.progress === 100).length,
      joined: dateOnly(student.createdAt),
      progress: mine.length
        ? Math.round(
            mine.reduce((sum, entry) => sum + entry.progress, 0) / mine.length,
          )
        : 0,
    };
  });
  const instructors = instructorsRaw.map((instructor) => {
    const ownCourses = coursesOut.filter(
      (course) => course.instructorId === id(instructor),
    );
    return {
      id: id(instructor),
      name: instructor.name,
      email: instructor.email,
      avatar: instructor.avatar,
      expertise: instructor.expertise,
      rating: instructor.rating,
      courses: ownCourses.length,
      students: ownCourses.reduce((sum, course) => sum + course.students, 0),
    };
  });
  const assignments = assignmentsRaw.map((item) => {
    const submission = studentSubmissionsRaw.find(
      (entry) => entry.assignmentId.toString() === id(item),
    );
    const managerStatus =
      item.submissions > 0
        ? "Submitted"
        : new Date(item.dueDate) < new Date()
          ? "Late"
          : "Pending";
    return {
      ...item,
      ...(user.role === "student"
        ? submission
          ? { status: submission.status, grade: submission.grade }
          : {
              status: new Date(item.dueDate) < new Date() ? "Late" : "Pending",
              grade: undefined,
            }
        : { status: managerStatus, grade: undefined }),
      id: id(item),
      courseId: item.courseId.toString(),
      audience: item.audience ?? "All course students",
      assignedStudentIds: (item.assignedStudentIds ?? []).map(String),
      dueDate: dateOnly(item.dueDate),
      _id: undefined,
    };
  });
  const quizzes = quizzesRaw.map(
    ({ questionItems: _questionItems, ...item }) => {
      const ownAttempts = studentAttemptsRaw.filter(
        (attempt) => attempt.quizId.toString() === id(item),
      );
      return {
        ...item,
        myScore: ownAttempts.length
          ? Math.round(
              ownAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
                ownAttempts.length,
            )
          : undefined,
        id: id(item),
        courseId: item.courseId.toString(),
        _id: undefined,
      };
    },
  );
  const certificates = certificatesRaw.map((item) => ({
    ...item,
    id: item.certificateId,
    mongoId: id(item),
    courseId: item.courseId?.toString(),
    studentId: item.studentId?.toString(),
    issued: dateOnly(item.issued),
    courseDuration: item.courseDuration ?? "",
    skills: item.skills ?? [],
    marksObtained: item.marksObtained,
    maxMarks: item.maxMarks ?? 100,
    remarks: item.remarks ?? "",
    ...certificateAchievement(item.marksObtained, item.maxMarks),
    _id: undefined,
  }));
  const announcements = announcementsRaw.map((item) => ({
    id: id(item),
    title: item.title,
    body: item.body,
    type: item.type,
    authorId: item.authorId?.toString(),
    date: dateOnly(item.createdAt),
  }));
  const notifications = notificationsRaw.map((item) => ({
    id: id(item),
    title: item.title,
    body: item.body,
    unread: item.userId
      ? item.unread
      : item.unread &&
        !item.readBy?.some((userId) => userId.toString() === user.id),
    time: dateOnly(item.createdAt),
  }));
  const discussions = discussionsRaw
    .filter((item) => item.authorId && item.courseId)
    .map((item) => ({
      id: id(item),
      title: item.title,
      author: {
        id: id(item.authorId),
        name: item.authorId.name,
        avatar: item.authorId.avatar,
      },
      course: item.courseId.title,
      courseId: id(item.courseId),
      replies: item.replies,
      likes: item.likes,
      answered: item.answered,
      time: dateOnly(item.createdAt),
    }));

  const myCourses =
    user.role === "student"
      ? enrollments
          .filter(
            (entry) =>
              entry.studentId === user.id && entry.status !== "Refunded",
          )
          .map((entry) => ({
            ...coursesOut.find((course) => course.id === entry.courseId),
            progress: entry.progress,
          }))
          .filter((course) => course.id)
      : user.role === "instructor"
        ? coursesOut.filter((course) => course.instructorId === user.id)
        : coursesOut;
  const visibleCourseIds = new Set(myCourses.map((course) => course.id));
  const visibleEnrollments =
    user.role === "admin"
      ? enrollments
      : user.role === "student"
        ? enrollments.filter((entry) => entry.studentId === user.id)
        : enrollments.filter((entry) => visibleCourseIds.has(entry.courseId));
  const visibleStudents =
    user.role === "admin"
      ? students
      : user.role === "instructor"
        ? students.filter((student) =>
            visibleEnrollments.some((entry) => entry.studentId === student.id),
          )
        : students.filter((student) => student.id === user.id);
  const visibleAssignments =
    user.role === "admin"
      ? assignments
      : assignments.filter(
          (item) =>
            visibleCourseIds.has(item.courseId) &&
            (user.role !== "student" ||
              item.audience === "All course students" ||
              item.assignedStudentIds.includes(user.id)),
        );
  const visibleQuizzes =
    user.role === "admin"
      ? quizzes
      : quizzes.filter((item) => visibleCourseIds.has(item.courseId));
  const visibleCertificates =
    user.role === "admin"
      ? certificates
      : user.role === "student"
        ? certificates.filter((item) => item.studentId === user.id)
        : certificates.filter((item) => visibleCourseIds.has(item.courseId));
  const visibleDiscussions =
    user.role === "admin"
      ? discussions
      : discussions.filter((item) => visibleCourseIds.has(item.courseId));

  const visibleCourses =
    user.role === "admin"
      ? coursesOut
      : user.role === "instructor"
        ? myCourses
        : coursesOut.filter((course) => course.status === "Published");
  const revenue = visibleEnrollments
    .filter((entry) => entry.status !== "Refunded")
    .reduce((sum, entry) => sum + entry.paidAmount, 0);
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (6 - index), 1),
    );
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    const entries = visibleEnrollments.filter((entry) => {
      const created = new Date(entry.date);
      return created >= start && created < end;
    });
    return {
      month: start.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      revenue: entries
        .filter((entry) => entry.status !== "Refunded")
        .reduce((sum, entry) => sum + entry.paidAmount, 0),
      students: entries.length,
    };
  });
  const enrollmentData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = dateOnly(date);
    return {
      day: date.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" }),
      enrollments: visibleEnrollments.filter((entry) => entry.date === key)
        .length,
    };
  });
  const categoryDistribution = categories
    .map((category) => ({
      name: category.name,
      value: visibleCourses.filter(
        (course) => course.category === category.name,
      ).length,
    }))
    .filter((entry) => entry.value > 0)
    .slice(0, 6);
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const previousMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const currentEnrollments = visibleEnrollments.filter(
    (entry) => new Date(entry.date) >= currentMonthStart,
  ).length;
  const previousEnrollments = visibleEnrollments.filter((entry) => {
    const created = new Date(entry.date);
    return created >= previousMonthStart && created < currentMonthStart;
  }).length;
  const growth = previousEnrollments
    ? Math.round(
        ((currentEnrollments - previousEnrollments) / previousEnrollments) *
          1000,
      ) / 10
    : currentEnrollments
      ? 100
      : 0;
  const stats = {
    totalStudents: visibleStudents.length,
    totalCourses: visibleCourses.length,
    activeInstructors:
      user.role === "admin"
        ? instructors.length
        : user.role === "instructor"
          ? 1
          : 0,
    revenue,
    completionRate: visibleEnrollments.filter(
      (entry) => entry.status !== "Refunded",
    ).length
      ? Math.round(
          visibleEnrollments
            .filter((entry) => entry.status !== "Refunded")
            .reduce((sum, entry) => sum + entry.progress, 0) /
            visibleEnrollments.filter((entry) => entry.status !== "Refunded")
              .length,
        )
      : 0,
    growth,
  };
  const visibleAssignmentIds = visibleAssignments.map(
    (assignment) => assignment.id,
  );
  stats.pendingSubmissions =
    user.role === "student"
      ? 0
      : await Submission.countDocuments({
          assignmentId: { $in: visibleAssignmentIds },
          status: "Submitted",
        });
  const recentSubmissions =
    user.role === "student"
      ? []
      : (
          await Submission.find({ assignmentId: { $in: visibleAssignmentIds } })
            .populate("studentId", "name email avatar")
            .populate("assignmentId", "title course")
            .sort({ submittedAt: -1 })
            .limit(10)
            .lean()
        )
          .filter(
            (submission) => submission.studentId && submission.assignmentId,
          )
          .map((submission) => ({
            id: id(submission),
            student: submission.studentId.name,
            studentAvatar: submission.studentId.avatar,
            assignment: submission.assignmentId.title,
            course: submission.assignmentId.course,
            status: submission.status,
            grade: submission.grade,
            submittedAt: dateOnly(submission.submittedAt),
          }));
  const hidePriceFromStudent = (course) => {
    const { price, ...courseWithoutPrice } = course;
    return {
      ...courseWithoutPrice,
      requiresAdminEnrollment: price > 0,
    };
  };
  return {
    categories: categories.map((category) => category.name),
    categoryRecords: categories.map((category) => ({
      id: id(category),
      name: category.name,
    })),
    courses:
      user.role === "student"
        ? visibleCourses.map(hidePriceFromStudent)
        : visibleCourses,
    myCourses:
      user.role === "student" ? myCourses.map(hidePriceFromStudent) : myCourses,
    students: visibleStudents,
    instructors,
    enrollments: visibleEnrollments,
    assignments: visibleAssignments,
    quizzes: visibleQuizzes,
    certificates: visibleCertificates,
    announcements,
    notifications,
    discussions: visibleDiscussions,
    recentSubmissions,
    revenueData: months,
    enrollmentData,
    categoryDistribution,
    stats,
  };
}

router.get("/data", async (request, response, next) => {
  try {
    response.json(await buildSnapshot(request.user));
  } catch (error) {
    next(error);
  }
});

router.get(
  "/users/students",
  allowRoles("admin", "instructor"),
  async (_request, response, next) => {
    try {
      response.json({
        students: await User.find({ role: "student" }).sort("name"),
      });
    } catch (error) {
      next(error);
    }
  },
);
router.get("/users/instructors", async (_request, response, next) => {
  try {
    response.json({
      instructors: await User.find({ role: "instructor" }).sort("name"),
    });
  } catch (error) {
    next(error);
  }
});

const readableModels = {
  categories: Category,
  courses: Course,
  enrollments: Enrollment,
  assignments: Assignment,
  quizzes: Quiz,
  certificates: Certificate,
  announcements: Announcement,
  notifications: Notification,
  discussions: Discussion,
};
async function readFilter(request, path) {
  if (
    request.user.role === "admin" ||
    ["categories", "announcements"].includes(path)
  )
    return {};
  if (path === "notifications")
    return { $or: [{ userId: request.user.id }, { userId: null }] };
  if (path === "courses")
    return request.user.role === "student"
      ? { status: "Published" }
      : { instructorId: request.user.id };
  const courseIds =
    request.user.role === "instructor"
      ? await Course.find({ instructorId: request.user.id }).distinct("_id")
      : await Enrollment.find({
          studentId: request.user.id,
          status: { $ne: "Refunded" },
        }).distinct("courseId");
  if (path === "enrollments")
    return request.user.role === "student"
      ? { studentId: request.user.id }
      : { courseId: { $in: courseIds } };
  if (path === "assignments" && request.user.role === "student")
    return {
      courseId: { $in: courseIds },
      $or: [
        { audience: "All course students" },
        { audience: { $exists: false } },
        { assignedStudentIds: request.user.id },
      ],
    };
  if (path === "certificates" && request.user.role === "student")
    return { studentId: request.user.id };
  if (["assignments", "quizzes", "certificates", "discussions"].includes(path))
    return { courseId: { $in: courseIds } };
  return {};
}
for (const [path, Model] of Object.entries(readableModels)) {
  router.get(`/${path}`, async (request, response, next) => {
    try {
      let query = Model.find(await readFilter(request, path)).sort({
        createdAt: -1,
      });
      if (path === "courses") query = query.select("-courseContent -resources");
      if (path === "quizzes") query = query.select("-questionItems");
      response.json({ items: await query });
    } catch (error) {
      next(error);
    }
  });
  router.get(`/${path}/:id`, async (request, response, next) => {
    try {
      let query = Model.findOne({
        _id: request.params.id,
        ...(await readFilter(request, path)),
      });
      if (path === "courses") query = query.select("-courseContent -resources");
      if (path === "quizzes") query = query.select("-questionItems");
      const item = await query;
      if (!item)
        return response.status(404).json({ message: "Item not found" });
      response.json({ item });
    } catch (error) {
      next(error);
    }
  });
}

router.patch("/users/me", async (request, response, next) => {
  try {
    if (
      !isOwnedCloudinaryAsset(
        request.body.avatarPublicId,
        "profile",
        request.user.id,
      )
    ) {
      return response.status(400).json({ message: "Invalid profile upload" });
    }
    const existing = await User.findById(request.user.id);
    const allowed = (({
      name,
      email,
      bio,
      avatar,
      avatarPublicId,
      preferences,
    }) => ({ name, email, bio, avatar, avatarPublicId, preferences }))(
      request.body,
    );
    Object.keys(allowed).forEach(
      (key) => allowed[key] === undefined && delete allowed[key],
    );
    const user = await User.findByIdAndUpdate(request.user.id, allowed, {
      new: true,
      runValidators: true,
    });
    if (request.body.name && request.body.name !== existing.name) {
      if (existing.role === "instructor") {
        const courseIds = await Course.find({ instructorId: user.id }).distinct(
          "_id",
        );
        await Promise.all([
          Course.updateMany(
            { instructorId: user.id },
            { $set: { instructor: user.name } },
          ),
          Certificate.updateMany(
            { courseId: { $in: courseIds } },
            { $set: { instructor: user.name } },
          ),
        ]);
      }
      if (existing.role === "student") {
        await Certificate.updateMany(
          { studentId: user.id },
          { $set: { student: user.name } },
        );
      }
    }
    if (
      request.body.avatarPublicId &&
      existing.avatarPublicId &&
      request.body.avatarPublicId !== existing.avatarPublicId
    ) {
      await deleteCloudinaryAsset(existing.avatarPublicId, "image");
    }
    response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/users/invite",
  allowRoles("admin"),
  async (request, response, next) => {
    try {
      const { name, email, role = "student", password } = request.body;
      if (!name || !email || !password)
        return response
          .status(400)
          .json({ message: "Name, email, and password are required" });
      if (!/^\S+@\S+\.\S+$/.test(email))
        return response
          .status(400)
          .json({ message: "Enter a valid email address" });
      if (password.length < 6)
        return response
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      if (!/^(student|instructor)$/.test(role))
        return response.status(400).json({ message: "Invalid account role" });
      const user = await User.create({
        name,
        email,
        role,
        passwordHash: await bcrypt.hash(password, 12),
        expertise: request.body.expertise,
      });
      response.status(201).json({
        message: "Account created",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.code === 11000)
        return response
          .status(409)
          .json({ message: "An account with this email already exists" });
      next(error);
    }
  },
);

router.patch(
  "/users/:id",
  allowRoles("admin"),
  async (request, response, next) => {
    try {
      const existing = await User.findById(request.params.id);
      if (!existing)
        return response.status(404).json({ message: "User not found" });
      if (
        existing.role === "instructor" &&
        request.body.role &&
        request.body.role !== "instructor" &&
        (await Course.exists({ instructorId: existing.id }))
      ) {
        return response.status(409).json({
          message:
            "Reassign or delete this instructor's courses before changing their role",
        });
      }
      const { name, email, expertise, rating, role } = request.body;
      const updates = { name, email, expertise, rating, role };
      Object.keys(updates).forEach(
        (key) => updates[key] === undefined && delete updates[key],
      );
      if (request.body.password)
        updates.passwordHash = await bcrypt.hash(request.body.password, 12);
      const user = await User.findByIdAndUpdate(request.params.id, updates, {
        new: true,
        runValidators: true,
      });
      if (name && name !== existing.name) {
        if (existing.role === "instructor") {
          const courseIds = await Course.find({
            instructorId: user.id,
          }).distinct("_id");
          await Promise.all([
            Course.updateMany(
              { instructorId: user.id },
              { $set: { instructor: name } },
            ),
            Certificate.updateMany(
              { courseId: { $in: courseIds } },
              { $set: { instructor: name } },
            ),
          ]);
        }
        if (existing.role === "student") {
          await Certificate.updateMany(
            { studentId: user.id },
            { $set: { student: name } },
          );
        }
      }
      response.json({ user });
    } catch (error) {
      if (error.code === 11000)
        return response
          .status(409)
          .json({ message: "That email is already in use" });
      next(error);
    }
  },
);

router.delete(
  "/users/:id",
  allowRoles("admin"),
  async (request, response, next) => {
    try {
      if (request.params.id === request.user.id)
        return response
          .status(400)
          .json({ message: "You cannot delete your own account" });
      const user = await User.findById(request.params.id);
      if (!user)
        return response.status(404).json({ message: "User not found" });
      if (
        user.role === "instructor" &&
        (await Course.exists({ instructorId: user.id }))
      ) {
        return response.status(409).json({
          message: "Reassign or delete this instructor's courses first",
        });
      }
      const userSubmissions = await Submission.find({
        studentId: user.id,
      }).lean();
      const userAttempts = await QuizAttempt.find({
        studentId: user.id,
      }).lean();
      const userEnrollments = await Enrollment.find({
        studentId: user.id,
      }).lean();
      await Promise.all([
        User.deleteOne({ _id: user.id }),
        Enrollment.deleteMany({ studentId: user.id }),
        Certificate.deleteMany({ studentId: user.id }),
        Submission.deleteMany({ studentId: user.id }),
        QuizAttempt.deleteMany({ studentId: user.id }),
        Discussion.deleteMany({ authorId: user.id }),
        Announcement.deleteMany({ authorId: user.id }),
        Discussion.updateMany({}, { $pull: { likedBy: user.id } }),
        Notification.deleteMany({ userId: user.id }),
        Notification.updateMany({}, { $pull: { readBy: user.id } }),
      ]);
      await deleteCloudinaryAsset(user.avatarPublicId, "image");
      const activeUserEnrollments = userEnrollments.filter(
        (enrollment) => enrollment.status !== "Refunded",
      );
      if (activeUserEnrollments.length) {
        await Course.bulkWrite(
          activeUserEnrollments.map((enrollment) => ({
            updateOne: {
              filter: { _id: enrollment.courseId, students: { $gt: 0 } },
              update: { $inc: { students: -1 } },
            },
          })),
        );
      }
      await Promise.all(
        userSubmissions.map((submission) =>
          deleteCloudinaryAsset(
            submission.attachmentPublicId,
            submission.attachmentResourceType || "raw",
          ),
        ),
      );
      for (const assignmentId of new Set(
        userSubmissions.map((submission) => submission.assignmentId.toString()),
      )) {
        await Assignment.updateOne(
          { _id: assignmentId },
          {
            $set: {
              submissions: await Submission.countDocuments({ assignmentId }),
            },
          },
        );
      }
      for (const quizId of new Set(
        userAttempts.map((attempt) => attempt.quizId.toString()),
      )) {
        const remainingAttempts = await QuizAttempt.find({ quizId })
          .select("score")
          .lean();
        await Quiz.updateOne(
          { _id: quizId },
          {
            $set: {
              attempts: remainingAttempts.length,
              avgScore: remainingAttempts.length
                ? Math.round(
                    remainingAttempts.reduce(
                      (sum, attempt) => sum + attempt.score,
                      0,
                    ) / remainingAttempts.length,
                  )
                : 0,
            },
          },
        );
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/courses",
  allowRoles("admin", "instructor"),
  async (request, response, next) => {
    try {
      const owner =
        request.user.role === "admin" && request.body.instructorId
          ? await User.findOne({
              _id: request.body.instructorId,
              role: "instructor",
            })
          : request.user;
      if (!owner)
        return response
          .status(400)
          .json({ message: "A valid instructor is required" });
      if (
        !isOwnedCloudinaryAsset(
          request.body.thumbnailPublicId,
          "thumbnail",
          request.user.id,
        )
      ) {
        return response
          .status(400)
          .json({ message: "Invalid thumbnail upload" });
      }
      if (
        Array.isArray(request.body.resources) &&
        request.body.resources.some(
          (resource) =>
            !isOwnedCloudinaryAsset(
              resource.publicId,
              "resource",
              request.user.id,
            ),
        )
      ) {
        return response
          .status(400)
          .json({ message: "Invalid course resource upload" });
      }
      if (!(await Category.exists({ name: request.body.category }))) {
        return response
          .status(400)
          .json({ message: "A valid category is required" });
      }
      const allowedFields = [
        "title",
        "description",
        "category",
        "level",
        "price",
        "duration",
        "status",
        "thumbnail",
        "thumbnailPublicId",
        "outcomes",
        "resources",
      ];
      const payload = Object.fromEntries(
        allowedFields
          .filter((field) => request.body[field] !== undefined)
          .map((field) => [field, request.body[field]]),
      );
      const course = await Course.create({
        ...payload,
        instructor: owner.name,
        instructorId: owner.id,
      });
      response
        .status(201)
        .json({ course: { ...course.toObject(), id: course.id } });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/courses/:id",
  allowRoles("admin", "instructor"),
  async (request, response, next) => {
    try {
      const course = await Course.findById(request.params.id);
      if (!course)
        return response.status(404).json({ message: "Course not found" });
      if (
        request.user.role === "instructor" &&
        course.instructorId.toString() !== request.user.id
      ) {
        return response
          .status(403)
          .json({ message: "You can only edit your own courses" });
      }
      if (
        !isOwnedCloudinaryAsset(
          request.body.thumbnailPublicId,
          "thumbnail",
          request.user.id,
        )
      ) {
        return response
          .status(400)
          .json({ message: "Invalid thumbnail upload" });
      }
      const previousTitle = course.title;
      const previousThumbnailPublicId = course.thumbnailPublicId;
      const allowed = [
        "title",
        "description",
        "category",
        "level",
        "price",
        "duration",
        "status",
        "thumbnail",
        "thumbnailPublicId",
        "outcomes",
      ];
      if (
        request.body.category !== undefined &&
        !(await Category.exists({ name: request.body.category }))
      ) {
        return response
          .status(400)
          .json({ message: "A valid category is required" });
      }
      allowed.forEach(
        (field) =>
          request.body[field] !== undefined &&
          (course[field] = request.body[field]),
      );
      if (request.user.role === "admin" && request.body.instructorId) {
        const instructor = await User.findOne({
          _id: request.body.instructorId,
          role: "instructor",
        });
        if (!instructor)
          return response
            .status(400)
            .json({ message: "A valid instructor is required" });
        course.instructorId = instructor.id;
        course.instructor = instructor.name;
      }
      await course.save();
      if (course.title !== previousTitle) {
        await Promise.all([
          Assignment.updateMany(
            { courseId: course.id },
            { $set: { course: course.title } },
          ),
          Quiz.updateMany(
            { courseId: course.id },
            { $set: { course: course.title } },
          ),
          Certificate.updateMany(
            { courseId: course.id },
            { $set: { course: course.title } },
          ),
        ]);
      }
      if (request.user.role === "admin" && request.body.instructorId) {
        await Certificate.updateMany(
          { courseId: course.id },
          { $set: { instructor: course.instructor } },
        );
      }
      if (
        request.body.thumbnailPublicId &&
        previousThumbnailPublicId &&
        request.body.thumbnailPublicId !== previousThumbnailPublicId
      ) {
        await deleteCloudinaryAsset(previousThumbnailPublicId, "image");
      }
      response.json({ course });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/courses/:id",
  allowRoles("admin", "instructor"),
  async (request, response, next) => {
    try {
      const course = await Course.findById(request.params.id);
      if (!course)
        return response.status(404).json({ message: "Course not found" });
      if (
        request.user.role === "instructor" &&
        course.instructorId.toString() !== request.user.id
      ) {
        return response
          .status(403)
          .json({ message: "You can only delete your own courses" });
      }
      const [assignmentIds, quizIds] = await Promise.all([
        Assignment.find({ courseId: course.id }).distinct("_id"),
        Quiz.find({ courseId: course.id }).distinct("_id"),
      ]);
      const courseSubmissions = await Submission.find({
        assignmentId: { $in: assignmentIds },
      }).lean();
      await Promise.all([
        Course.deleteOne({ _id: course.id }),
        Enrollment.deleteMany({ courseId: course.id }),
        Assignment.deleteMany({ courseId: course.id }),
        Quiz.deleteMany({ courseId: course.id }),
        Certificate.deleteMany({ courseId: course.id }),
        Discussion.deleteMany({ courseId: course.id }),
        Submission.deleteMany({ assignmentId: { $in: assignmentIds } }),
        QuizAttempt.deleteMany({ quizId: { $in: quizIds } }),
      ]);
      await Promise.all([
        deleteCloudinaryAsset(course.thumbnailPublicId, "image"),
        ...course.courseContent.map((lesson) =>
          deleteCloudinaryAsset(lesson.videoPublicId, "video"),
        ),
        ...course.resources.map((resource) =>
          deleteCloudinaryAsset(
            resource.publicId,
            resource.resourceType || "raw",
          ),
        ),
        ...courseSubmissions.map((submission) =>
          deleteCloudinaryAsset(
            submission.attachmentPublicId,
            submission.attachmentResourceType || "raw",
          ),
        ),
      ]);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/enrollments",
  allowRoles("admin", "student"),
  async (request, response, next) => {
    try {
      const course = await Course.findById(request.body.courseId);
      if (!course || course.status !== "Published")
        return response
          .status(404)
          .json({ message: "Course is not available" });
      if (request.user.role === "student" && course.price > 0) {
        return response.status(402).json({
          message:
            "Paid courses require an administrator-recorded payment enrollment",
        });
      }
      const studentId =
        request.user.role === "student"
          ? request.user.id
          : request.body.studentId;
      const student = await User.findOne({ _id: studentId, role: "student" });
      if (!student)
        return response
          .status(400)
          .json({ message: "A valid student is required" });
      const amount = Number(
        request.user.role === "admin"
          ? (request.body.amount ?? course.price)
          : 0,
      );
      const status =
        request.user.role === "admin"
          ? (request.body.status ?? (course.price ? "Paid" : "Free"))
          : "Free";
      const paidAmount = Number(
        request.user.role === "admin"
          ? (request.body.paidAmount ?? (status === "Paid" ? amount : 0))
          : 0,
      );
      const validationMessage = paymentValidationMessage({
        amount,
        paidAmount,
        status,
      });
      if (validationMessage)
        return response.status(400).json({ message: validationMessage });
      const enrollment = await Enrollment.create({
        studentId,
        courseId: course.id,
        amount,
        paidAmount,
        paymentMethod:
          status === "Free"
            ? "Not applicable"
            : (request.body.paymentMethod ?? "Other"),
        status,
        progress: 0,
      });
      await Course.updateOne({ _id: course.id }, { $inc: { students: 1 } });
      await Notification.create({
        userId: student.id,
        title: "Course enrollment confirmed",
        body: `You are enrolled in ${course.title}.`,
      });
      response.status(201).json({ enrollment });
    } catch (error) {
      if (error.code === 11000)
        return response
          .status(409)
          .json({ message: "You are already enrolled in this course" });
      next(error);
    }
  },
);

router.patch(
  "/enrollments/id/:id",
  allowRoles("admin"),
  async (request, response, next) => {
    try {
      const updates = {};
      if (request.body.amount !== undefined)
        updates.amount = Number(request.body.amount);
      if (request.body.paidAmount !== undefined)
        updates.paidAmount = Number(request.body.paidAmount);
      if (request.body.paymentMethod !== undefined)
        updates.paymentMethod = request.body.paymentMethod;
      if (request.body.status !== undefined)
        updates.status = request.body.status;
      const existing = await Enrollment.findById(request.params.id);
      if (!existing)
        return response.status(404).json({ message: "Enrollment not found" });
      const paymentDetails = {
        amount: updates.amount ?? existing.amount,
        paidAmount:
          updates.paidAmount ??
          existing.paidAmount ??
          (existing.status === "Paid" ? existing.amount : 0),
        status: updates.status ?? existing.status,
      };
      const validationMessage = paymentValidationMessage(paymentDetails);
      if (validationMessage)
        return response.status(400).json({ message: validationMessage });
      if (paymentDetails.status === "Free")
        updates.paymentMethod = "Not applicable";
      const wasActive = existing.status !== "Refunded";
      Object.assign(existing, updates);
      await existing.save();
      const isActive = existing.status !== "Refunded";
      if (wasActive !== isActive) {
        await Course.updateOne(
          {
            _id: existing.courseId,
            ...(isActive ? {} : { students: { $gt: 0 } }),
          },
          { $inc: { students: isActive ? 1 : -1 } },
        );
      }
      const enrollment = existing;
      response.json({ enrollment });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/enrollments/id/:id",
  allowRoles("admin"),
  async (request, response, next) => {
    try {
      const enrollment = await Enrollment.findByIdAndDelete(request.params.id);
      if (!enrollment)
        return response.status(404).json({ message: "Enrollment not found" });
      if (enrollment.status !== "Refunded") {
        await Course.updateOne(
          { _id: enrollment.courseId, students: { $gt: 0 } },
          { $inc: { students: -1 } },
        );
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/certificates",
  allowRoles("admin", "instructor"),
  async (request, response, next) => {
    try {
      const [course, student] = await Promise.all([
        Course.findById(request.body.courseId),
        User.findOne({ _id: request.body.studentId, role: "student" }),
      ]);
      if (!course || !student)
        return response
          .status(400)
          .json({ message: "Valid course and student are required" });
      if (
        request.user.role === "instructor" &&
        course.instructorId.toString() !== request.user.id
      )
        return response.status(403).json({
          message: "You can only issue certificates for your courses",
        });
      if (
        !(await Enrollment.exists({
          courseId: course.id,
          studentId: student.id,
          status: { $ne: "Refunded" },
        }))
      ) {
        return response
          .status(400)
          .json({ message: "The student must be enrolled in this course" });
      }
      const marksObtained = Number(request.body.marksObtained);
      const maxMarks = Number(request.body.maxMarks);
      const marksError = certificateMarksError(marksObtained, maxMarks);
      if (marksError) return response.status(400).json({ message: marksError });
      const certificate = await Certificate.create({
        certificateId: request.body.certificateId ?? `CERT-${Date.now()}`,
        courseId: course.id,
        studentId: student.id,
        course: course.title,
        student: student.name,
        instructor: course.instructor,
        courseDuration: course.duration,
        skills: (course.outcomes ?? []).filter(Boolean).slice(0, 5),
        marksObtained,
        maxMarks,
        remarks: request.body.remarks ?? "",
        issued: request.body.issued ?? new Date(),
      });
      await Notification.create({
        userId: student.id,
        title: "Certificate issued",
        body: `Your certificate for ${course.title} is ready.`,
      });
      response.status(201).json({ certificate });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/certificates/:id",
  allowRoles("admin", "instructor"),
  async (request, response, next) => {
    try {
      const certificate = await Certificate.findById(
        request.params.id,
      ).populate("courseId");
      if (!certificate)
        return response.status(404).json({ message: "Certificate not found" });
      if (
        request.user.role === "instructor" &&
        certificate.courseId?.instructorId.toString() !== request.user.id
      )
        return response
          .status(403)
          .json({ message: "You can only edit certificates for your courses" });
      if (request.body.issued) certificate.issued = request.body.issued;
      if (request.body.certificateId)
        certificate.certificateId = request.body.certificateId;
      if (
        request.body.marksObtained !== undefined ||
        request.body.maxMarks !== undefined
      ) {
        const marksObtained = Number(
          request.body.marksObtained ?? certificate.marksObtained,
        );
        const maxMarks = Number(request.body.maxMarks ?? certificate.maxMarks);
        const marksError = certificateMarksError(marksObtained, maxMarks);
        if (marksError)
          return response.status(400).json({ message: marksError });
        certificate.marksObtained = marksObtained;
        certificate.maxMarks = maxMarks;
      }
      if (request.body.remarks !== undefined)
        certificate.remarks = request.body.remarks;
      await certificate.save();
      response.json({ certificate });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/certificates/:id",
  allowRoles("admin", "instructor"),
  async (request, response, next) => {
    try {
      const certificate = await Certificate.findById(
        request.params.id,
      ).populate("courseId");
      if (!certificate)
        return response.status(404).json({ message: "Certificate not found" });
      if (
        request.user.role === "instructor" &&
        certificate.courseId?.instructorId.toString() !== request.user.id
      )
        return response.status(403).json({
          message: "You can only delete certificates for your courses",
        });
      await certificate.deleteOne();
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

const createRoutes = [
  ["categories", Category, ["admin"]],
  ["assignments", Assignment, ["admin", "instructor"]],
  ["quizzes", Quiz, ["admin", "instructor"]],
  ["announcements", Announcement, ["admin", "instructor"]],
  ["discussions", Discussion, ["admin", "instructor", "student"]],
];
const resourceCreateFields = {
  categories: ["name"],
  assignments: [
    "title",
    "courseId",
    "audience",
    "assignedStudentIds",
    "dueDate",
    "description",
    "maxScore",
  ],
  quizzes: ["title", "courseId", "duration"],
  announcements: ["title", "body", "type"],
  discussions: ["title", "body", "courseId"],
};
const resourceUpdateFields = {
  categories: ["name"],
  assignments: [
    "title",
    "audience",
    "assignedStudentIds",
    "dueDate",
    "description",
    "maxScore",
  ],
  quizzes: ["title", "duration"],
  announcements: ["title", "body", "type"],
  discussions: ["title", "body"],
};
function pickFields(source, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
}
async function validateAssignmentAudience(payload, courseId) {
  const audience = payload.audience ?? "All course students";
  if (audience === "All course students") {
    payload.audience = audience;
    payload.assignedStudentIds = [];
    return null;
  }
  if (audience !== "Selected students")
    return "A valid assignment audience is required";
  if (
    !Array.isArray(payload.assignedStudentIds) ||
    !payload.assignedStudentIds.length
  )
    return "Select at least one enrolled student";
  const eligibleIds = new Set(
    (
      await Enrollment.find({
        courseId,
        status: { $ne: "Refunded" },
      }).distinct("studentId")
    ).map(String),
  );
  const assignedStudentIds = [
    ...new Set(payload.assignedStudentIds.map(String)),
  ];
  if (assignedStudentIds.some((studentId) => !eligibleIds.has(studentId)))
    return "Assignments can only be sent to students enrolled in the selected course";
  payload.audience = audience;
  payload.assignedStudentIds = assignedStudentIds;
  return null;
}
async function authorizeResource(request, path, item) {
  if (request.user.role === "admin") return;
  if (path === "assignments" || path === "quizzes") {
    const courseId = request.body.courseId ?? item?.courseId;
    const course = await Course.findById(courseId);
    if (!course || course.instructorId.toString() !== request.user.id) {
      const error = new Error(
        "You can only manage content for your own courses",
      );
      error.status = 403;
      throw error;
    }
  }
  if (path === "discussions" && !item) {
    const course = await Course.findById(request.body.courseId);
    const allowed =
      request.user.role === "instructor"
        ? course?.instructorId.toString() === request.user.id
        : Boolean(
            await Enrollment.exists({
              studentId: request.user.id,
              courseId: course?.id,
              status: { $ne: "Refunded" },
            }),
          );
    if (!course || !allowed) {
      const error = new Error(
        "You can only start discussions in your own or enrolled courses",
      );
      error.status = 403;
      throw error;
    }
  }
  if (
    (path === "announcements" || path === "discussions") &&
    item &&
    item.authorId?.toString() !== request.user.id
  ) {
    const error = new Error("You can only modify your own content");
    error.status = 403;
    throw error;
  }
}
for (const [path, Model, roles] of createRoutes) {
  router.post(
    `/${path}`,
    allowRoles(...roles),
    async (request, response, next) => {
      try {
        await authorizeResource(request, path);
        const payload = pickFields(request.body, resourceCreateFields[path]);
        if (path === "announcements" || path === "discussions") {
          payload.authorId = request.user.id;
        }
        if (path === "assignments" || path === "quizzes") {
          const course = await Course.findById(payload.courseId);
          if (!course)
            return response
              .status(400)
              .json({ message: "A valid course is required" });
          payload.course = course.title;
        }
        if (path === "assignments") {
          const audienceError = await validateAssignmentAudience(
            payload,
            payload.courseId,
          );
          if (audienceError)
            return response.status(400).json({ message: audienceError });
        }
        const item = await Model.create(payload);
        if (path === "announcements") {
          await Notification.create({ title: item.title, body: item.body });
        }
        if (path === "assignments" || path === "quizzes") {
          let studentIds = await Enrollment.find({
            courseId: payload.courseId,
            status: { $ne: "Refunded" },
          }).distinct("studentId");
          if (
            path === "assignments" &&
            payload.audience === "Selected students"
          ) {
            const assignedIds = new Set(payload.assignedStudentIds.map(String));
            studentIds = studentIds.filter((studentId) =>
              assignedIds.has(String(studentId)),
            );
          }
          if (studentIds.length) {
            await Notification.insertMany(
              studentIds.map((studentId) => ({
                userId: studentId,
                title: path === "assignments" ? "New assignment" : "New quiz",
                body: `${item.title} is now available in ${payload.course}.`,
              })),
            );
          }
        }
        response.status(201).json({ item });
      } catch (error) {
        next(error);
      }
    },
  );
  router.patch(
    `/${path}/:id`,
    allowRoles(...roles),
    async (request, response, next) => {
      try {
        const existing = await Model.findById(request.params.id);
        if (!existing)
          return response.status(404).json({ message: "Item not found" });
        await authorizeResource(request, path, existing);
        const updates = pickFields(request.body, resourceUpdateFields[path]);
        if (path === "assignments") {
          const audiencePayload = {
            audience:
              updates.audience ?? existing.audience ?? "All course students",
            assignedStudentIds:
              updates.assignedStudentIds ?? existing.assignedStudentIds ?? [],
          };
          const audienceError = await validateAssignmentAudience(
            audiencePayload,
            existing.courseId,
          );
          if (audienceError)
            return response.status(400).json({ message: audienceError });
          updates.audience = audiencePayload.audience;
          updates.assignedStudentIds = audiencePayload.assignedStudentIds;
        }
        const item = await Model.findByIdAndUpdate(request.params.id, updates, {
          new: true,
          runValidators: true,
        });
        if (
          path === "categories" &&
          request.body.name &&
          request.body.name !== existing.name
        ) {
          await Course.updateMany(
            { category: existing.name },
            { category: request.body.name },
          );
        }
        response.json({ item });
      } catch (error) {
        next(error);
      }
    },
  );
  router.delete(
    `/${path}/:id`,
    allowRoles(...roles),
    async (request, response, next) => {
      try {
        const item = await Model.findById(request.params.id);
        if (!item)
          return response.status(404).json({ message: "Item not found" });
        await authorizeResource(request, path, item);
        if (
          path === "categories" &&
          (await Course.exists({ category: item.name }))
        ) {
          return response
            .status(409)
            .json({ message: "Move or delete courses in this category first" });
        }
        if (path === "assignments") {
          const submissions = await Submission.find({
            assignmentId: item.id,
          }).lean();
          await Submission.deleteMany({ assignmentId: item.id });
          await Promise.all(
            submissions.map((submission) =>
              deleteCloudinaryAsset(
                submission.attachmentPublicId,
                submission.attachmentResourceType || "raw",
              ),
            ),
          );
        }
        if (path === "quizzes")
          await QuizAttempt.deleteMany({ quizId: item.id });
        await item.deleteOne();
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  );
}

router.patch("/notifications/:id/read", async (request, response, next) => {
  try {
    const notification = await Notification.findOne({
      _id: request.params.id,
      $or: [{ userId: request.user.id }, { userId: null }],
    });
    if (!notification)
      return response.status(404).json({ message: "Notification not found" });
    if (notification.userId) notification.unread = false;
    else if (
      !notification.readBy.some(
        (userId) => userId.toString() === request.user.id,
      )
    ) {
      notification.readBy.push(request.user.id);
    }
    await notification.save();
    response.json({ message: "Notification read" });
  } catch (error) {
    next(error);
  }
});

export default router;
