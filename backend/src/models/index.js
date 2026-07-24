import mongoose from "mongoose";

const options = { timestamps: true, versionKey: false };

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    videoPublicId: { type: String, default: "" },
    duration: { type: String, default: "10 min" },
    content: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: [
        (options) => options.length >= 2,
        "At least two options are required",
      ],
    },
    correctAnswer: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: "" },
    points: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "instructor", "student"],
      default: "student",
    },
    avatar: String,
    avatarPublicId: { type: String, default: "" },
    bio: { type: String, default: "" },
    expertise: { type: String, default: "General" },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
  },
  options,
);

const categorySchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  options,
);

const courseResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: "link" },
    publicId: { type: String, default: "" },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw", ""],
      default: "",
    },
  },
  options,
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },
    instructor: { type: String, required: true },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    price: { type: Number, min: 0, default: 0 },
    students: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    lessons: { type: Number, default: 0 },
    duration: { type: String, default: "0h" },
    status: {
      type: String,
      enum: ["Published", "Draft", "Archived"],
      default: "Draft",
    },
    thumbnail: {
      type: String,
      default: "https://picsum.photos/seed/course/600/400",
    },
    thumbnailPublicId: { type: String, default: "" },
    outcomes: [String],
    courseContent: { type: [lessonSchema], default: [] },
    resources: { type: [courseResourceSchema], default: [] },
  },
  options,
);

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: { type: Number, min: 0, default: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank transfer", "Other", "Not applicable"],
      default: "Other",
    },
    status: {
      type: String,
      enum: ["Paid", "Partially Paid", "Pending", "Refunded", "Free"],
      default: "Paid",
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  options,
);
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    course: { type: String, required: true },
    audience: {
      type: String,
      enum: ["All course students", "Selected students"],
      default: "All course students",
    },
    assignedStudentIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Submitted", "Graded", "Late"],
      default: "Pending",
    },
    grade: Number,
    submissions: { type: Number, default: 0 },
    description: { type: String, default: "" },
    maxScore: { type: Number, min: 1, default: 100 },
  },
  options,
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    course: { type: String, required: true },
    questions: { type: Number, default: 0 },
    duration: { type: String, default: "15 min" },
    attempts: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    questionItems: { type: [quizQuestionSchema], default: [] },
  },
  options,
);

const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    course: String,
    student: String,
    instructor: String,
    courseDuration: { type: String, default: "" },
    skills: { type: [String], default: [] },
    marksObtained: { type: Number, min: 0 },
    maxMarks: { type: Number, min: 1, default: 100 },
    remarks: { type: String, trim: true, maxlength: 500, default: "" },
    issued: { type: Date, default: Date.now },
  },
  options,
);

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "success", "warning"],
      default: "info",
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  options,
);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    unread: { type: Boolean, default: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  options,
);

const discussionReplySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    authorAvatar: { type: String, default: "" },
    body: { type: String, required: true, trim: true },
  },
  options,
);

const discussionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, default: "" },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    replies: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    answered: { type: Boolean, default: false },
    replyItems: { type: [discussionReplySchema], default: [] },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  options,
);

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true },
    attachmentUrl: { type: String, default: "" },
    attachmentPublicId: { type: String, default: "" },
    attachmentResourceType: {
      type: String,
      enum: ["image", "video", "raw", ""],
      default: "",
    },
    status: {
      type: String,
      enum: ["Submitted", "Graded", "Returned"],
      default: "Submitted",
    },
    grade: { type: Number, min: 0 },
    feedback: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
  },
  options,
);
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [Number],
    score: { type: Number, required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  options,
);

export const User = mongoose.model("User", userSchema);
export const Category = mongoose.model("Category", categorySchema);
export const Course = mongoose.model("Course", courseSchema);
export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export const Assignment = mongoose.model("Assignment", assignmentSchema);
export const Quiz = mongoose.model("Quiz", quizSchema);
export const Certificate = mongoose.model("Certificate", certificateSchema);
export const Announcement = mongoose.model("Announcement", announcementSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
export const Discussion = mongoose.model("Discussion", discussionSchema);
export const Submission = mongoose.model("Submission", submissionSchema);
export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
