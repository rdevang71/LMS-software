import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
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
} from "../src/models/index.js";

const execute = process.argv.includes("--execute");

const demoEmails = [
  "admin@lms.io",
  "instructor@lms.io",
  "student@lms.io",
  ...Array.from({ length: 7 }, (_, index) => `instructor${index + 1}@lms.io`),
  ...Array.from({ length: 24 }, (_, index) => `student${index + 1}@mail.com`),
];

const demoTopics = [
  "React & TypeScript Masterclass",
  "Advanced Python for Data Science",
  "UI/UX Design Fundamentals",
  "Digital Marketing Bootcamp",
  "Machine Learning A to Z",
  "Financial Modeling",
  "Product Management",
  "Photography for Beginners",
  "Ableton Live Production",
  "Business English",
  "Node.js Backend Engineering",
  "GraphQL in Practice",
  "Figma from Zero to Hero",
  "SEO Mastery",
  "Public Speaking",
  "Docker & Kubernetes",
  "AWS Solutions Architect",
  "iOS Development",
  "Android with Kotlin",
  "Growth Hacking",
];

const demoCategories = [
  "Web Development",
  "Data Science",
  "Design",
  "Business",
  "Marketing",
  "Photography",
  "Music",
  "Language",
];

const demoAnnouncementTitles = [
  "Platform Maintenance",
  "New AI Course Bundle",
  "Certificate Update",
];

const demoNotificationPairs = [
  { title: "New assignment due", body: "Build a Landing Page is due soon" },
  {
    title: "Quiz result available",
    body: "Your latest quiz result is available",
  },
  {
    title: "New course announcement",
    body: "An instructor posted an update",
  },
];

function ids(documents) {
  return documents.map((document) => document._id);
}

async function findTargets() {
  const demoUsers = await User.find({ email: { $in: demoEmails } })
    .select("_id email")
    .lean();
  const demoCourses = await Course.find({
    description: /^A practical, project-focused course covering /,
    thumbnail: /^https:\/\/picsum\.photos\/seed\/course-/,
  })
    .select("_id title")
    .lean();
  const knownTopicCourses = await Course.find({ title: { $in: demoTopics } })
    .select("_id title description thumbnail instructor")
    .lean();
  const matchedCourseIds = new Set(
    demoCourses.map((course) => String(course._id)),
  );
  const unmatchedKnownTopicCourses = knownTopicCourses.filter(
    (course) => !matchedCourseIds.has(String(course._id)),
  );
  const userIds = ids(demoUsers);
  const courseIds = ids(demoCourses);
  const preservedCourses = await Course.find({ _id: { $nin: courseIds } })
    .select("_id title description thumbnail instructor")
    .lean();
  const assignments = await Assignment.find({ courseId: { $in: courseIds } })
    .select("_id")
    .lean();
  const quizzes = await Quiz.find({ courseId: { $in: courseIds } })
    .select("_id")
    .lean();
  const assignmentIds = ids(assignments);
  const quizIds = ids(quizzes);

  const filters = {
    users: { _id: { $in: userIds } },
    courses: { _id: { $in: courseIds } },
    enrollments: {
      $or: [{ courseId: { $in: courseIds } }, { studentId: { $in: userIds } }],
    },
    assignments: { _id: { $in: assignmentIds } },
    quizzes: { _id: { $in: quizIds } },
    submissions: {
      $or: [
        { assignmentId: { $in: assignmentIds } },
        { studentId: { $in: userIds } },
      ],
    },
    quizAttempts: {
      $or: [{ quizId: { $in: quizIds } }, { studentId: { $in: userIds } }],
    },
    certificates: {
      $or: [
        { courseId: { $in: courseIds } },
        { studentId: { $in: userIds } },
        { certificateId: /^CERT-2026\d{4}$/ },
      ],
    },
    discussions: {
      $or: [{ courseId: { $in: courseIds } }, { authorId: { $in: userIds } }],
    },
    announcements: { title: { $in: demoAnnouncementTitles } },
    notifications: {
      $or: [{ userId: { $in: userIds } }, ...demoNotificationPairs],
    },
  };

  const counts = Object.fromEntries(
    await Promise.all(
      [
        ["users", User],
        ["courses", Course],
        ["enrollments", Enrollment],
        ["assignments", Assignment],
        ["quizzes", Quiz],
        ["submissions", Submission],
        ["quizAttempts", QuizAttempt],
        ["certificates", Certificate],
        ["discussions", Discussion],
        ["announcements", Announcement],
        ["notifications", Notification],
      ].map(async ([name, Model]) => [
        name,
        await Model.countDocuments(filters[name]),
      ]),
    ),
  );

  return {
    demoUsers,
    demoCourses,
    unmatchedKnownTopicCourses,
    preservedCourses,
    userIds,
    courseIds,
    filters,
    counts,
  };
}

async function removeDemoData(targets) {
  const { filters, userIds, courseIds } = targets;

  await Promise.all([
    Submission.deleteMany(filters.submissions),
    QuizAttempt.deleteMany(filters.quizAttempts),
    Certificate.deleteMany(filters.certificates),
    Discussion.deleteMany(filters.discussions),
    Notification.deleteMany(filters.notifications),
  ]);
  await Promise.all([
    Enrollment.deleteMany(filters.enrollments),
    Assignment.deleteMany(filters.assignments),
    Quiz.deleteMany(filters.quizzes),
    Announcement.deleteMany(filters.announcements),
  ]);
  await Course.deleteMany(filters.courses);
  await User.deleteMany(filters.users);

  await Promise.all([
    Notification.updateMany({}, { $pull: { readBy: { $in: userIds } } }),
    Discussion.updateMany({}, { $pull: { likedBy: { $in: userIds } } }),
    Assignment.updateMany(
      {},
      { $pull: { assignedStudentIds: { $in: userIds } } },
    ),
  ]);

  for (const category of demoCategories) {
    if (!(await Course.exists({ category }))) {
      await Category.deleteOne({ name: category });
    }
  }

  const remainingCourses = await Course.find({
    _id: { $nin: courseIds },
  }).select("_id");
  for (const course of remainingCourses) {
    course.students = await Enrollment.countDocuments({
      courseId: course.id,
      status: { $ne: "Refunded" },
    });
    await course.save();
  }
}

try {
  await connectDatabase();
  const targets = await findTargets();
  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        preservedAdmin: "rdevang71@gmail.com",
        demoUsers: targets.demoUsers.map((user) => user.email),
        demoCourses: targets.demoCourses.map((course) => course.title),
        unmatchedKnownTopicCourses: targets.unmatchedKnownTopicCourses,
        preservedCourses: targets.preservedCourses,
        counts: targets.counts,
      },
      null,
      2,
    ),
  );

  if (execute) {
    await removeDemoData(targets);
    const remaining = await findTargets();
    console.log(
      JSON.stringify(
        { removed: targets.counts, remainingDemoRecords: remaining.counts },
        null,
        2,
      ),
    );
  }
} finally {
  await mongoose.disconnect();
}
