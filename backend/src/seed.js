import bcrypt from "bcryptjs";
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
} from "./models/index.js";

const categories = [
  "Web Development",
  "Data Science",
  "Design",
  "Business",
  "Marketing",
  "Photography",
  "Music",
  "Language",
];
const topics = [
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
const names = [
  "Aisha Chen",
  "Liam Patel",
  "Sofia Nguyen",
  "Noah Kim",
  "Priya Garcia",
  "Ethan Silva",
  "Maya Ali",
  "Kai Cohen",
  "Zara Okafor",
  "Owen Rossi",
  "Ava Tan",
  "Leo Reyes",
];

async function ensureLearningContent() {
  const courses = await Course.find().sort({ createdAt: 1 });
  for (const course of courses) {
    if (!course.courseContent.length) {
      course.courseContent = [
        {
          title: `Welcome to ${course.title}`,
          description:
            "Meet your instructor, understand the learning outcomes, and set up your study plan.",
          content: `This lesson introduces ${course.title}. Review the course goals and note what you want to build by the end.`,
          videoUrl:
            "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          duration: "6 min",
          order: 1,
        },
        {
          title: "Core concepts and guided practice",
          description:
            "Learn the essential ideas through a practical walkthrough.",
          content: `Work through the core concepts for ${course.title}. Pause the video and reproduce each step before continuing.`,
          videoUrl:
            "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          duration: "12 min",
          order: 2,
        },
        {
          title: "Apply what you learned",
          description:
            "Turn the lesson into a small project and review the completion checklist.",
          content:
            "Complete the practice task, compare your result with the requirements, and record any questions for discussion.",
          videoUrl:
            "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
          duration: "9 min",
          order: 3,
        },
      ];
      course.lessons = course.courseContent.length;
      await course.save();
    }
  }

  const quizzes = await Quiz.find();
  for (const quiz of quizzes) {
    if (!quiz.questionItems.length) {
      quiz.questionItems = [
        {
          question: `What is the best first step when learning ${quiz.course}?`,
          options: [
            "Define the outcome",
            "Skip the fundamentals",
            "Avoid practice",
            "Memorize every detail",
          ],
          correctAnswer: 0,
          explanation: "A clear outcome makes practice focused and measurable.",
          points: 1,
        },
        {
          question: "Which approach produces the strongest understanding?",
          options: [
            "Watching only",
            "Guided practice and feedback",
            "Guessing",
            "Copying without review",
          ],
          correctAnswer: 1,
          explanation:
            "Active practice plus feedback reveals and corrects misunderstandings.",
          points: 1,
        },
        {
          question: "What should you do after completing a practical task?",
          options: [
            "Delete it",
            "Review it against the requirements",
            "Ignore errors",
            "Start over without reflection",
          ],
          correctAnswer: 1,
          explanation:
            "Review closes the learning loop and identifies the next improvement.",
          points: 1,
        },
      ];
      quiz.questions = quiz.questionItems.length;
      await quiz.save();
    }
  }

  await Assignment.updateMany(
    { $or: [{ description: { $exists: false } }, { description: "" }] },
    {
      $set: {
        description:
          "Complete the task using the techniques demonstrated in the course. Explain your decisions, include the final result, and add an optional supporting link.",
        maxScore: 100,
      },
    },
  );

  const replyAuthor = await User.findOne({ email: "instructor@lms.io" });
  if (replyAuthor) {
    const discussions = await Discussion.find();
    for (const discussion of discussions) {
      if (!discussion.body)
        discussion.body =
          "Share your approach, the problem you are facing, and what you have already tried so the community can help.";
      if (!discussion.replyItems.length) {
        discussion.replyItems = [
          {
            authorId: replyAuthor.id,
            authorName: replyAuthor.name,
            authorAvatar: replyAuthor.avatar,
            body: "Start by reducing the problem to the smallest reproducible example, then verify each assumption one at a time.",
          },
          {
            authorId: discussion.authorId,
            authorName: "Course learner",
            body: "That helped me isolate the issue. I have added the working result to my notes.",
          },
        ];
      }
      discussion.replies = discussion.replyItems.length;
      discussion.likes = discussion.likedBy.length;
      await discussion.save();
    }
  }

  for (const course of courses) {
    course.students = await Enrollment.countDocuments({
      courseId: course.id,
      status: { $ne: "Refunded" },
    });
    await course.save();
  }
  for (const assignment of await Assignment.find()) {
    assignment.submissions = await Submission.countDocuments({
      assignmentId: assignment.id,
    });
    await assignment.save();
  }
  for (const quiz of quizzes) {
    const attempts = await QuizAttempt.find({ quizId: quiz.id })
      .select("score")
      .lean();
    quiz.attempts = attempts.length;
    quiz.avgScore = attempts.length
      ? Math.round(
          attempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            attempts.length,
        )
      : 0;
    await quiz.save();
  }
}

export async function seedDatabase() {
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const requestedAdminPasswordHash = await bcrypt.hash("12345678", 12);

  await User.updateOne(
    { email: "rdevang71@gmail.com" },
    {
      $setOnInsert: {
        name: "R Devang",
        email: "rdevang71@gmail.com",
        role: "admin",
        passwordHash: requestedAdminPasswordHash,
      },
    },
    { upsert: true },
  );

  const demoAccounts = [
    { name: "Alex Morgan", email: "admin@lms.io", role: "admin" },
    {
      name: "Priya Sharma",
      email: "instructor@lms.io",
      role: "instructor",
      expertise: "Web Development",
    },
    { name: "Jordan Lee", email: "student@lms.io", role: "student" },
  ];

  for (const account of demoAccounts) {
    await User.updateOne(
      { email: account.email },
      { $setOnInsert: { ...account, passwordHash } },
      { upsert: true },
    );
  }

  if ((await Category.countDocuments()) > 0) {
    await ensureLearningContent();
    return;
  }

  await Category.insertMany(categories.map((name) => ({ name })));
  const demoInstructor = await User.findOne({ email: "instructor@lms.io" });
  const demoStudent = await User.findOne({ email: "student@lms.io" });

  const instructors = [demoInstructor];
  for (let index = 0; index < 7; index += 1) {
    instructors.push(
      await User.create({
        name: names[index],
        email: `instructor${index + 1}@lms.io`,
        role: "instructor",
        passwordHash,
        expertise: categories[index % categories.length],
        rating: 4.2 + (index % 7) / 10,
        avatar: `https://i.pravatar.cc/100?img=${index + 1}`,
      }),
    );
  }

  const students = [demoStudent];
  for (let index = 0; index < 24; index += 1) {
    students.push(
      await User.create({
        name: names[index % names.length] + ` ${index + 1}`,
        email: `student${index + 1}@mail.com`,
        role: "student",
        passwordHash,
        avatar: `https://i.pravatar.cc/100?img=${index + 25}`,
      }),
    );
  }

  const courses = [];
  for (let index = 0; index < 20; index += 1) {
    const instructor = instructors[index % instructors.length];
    courses.push(
      await Course.create({
        title: topics[index],
        description: `A practical, project-focused course covering ${topics[index]}.`,
        category: categories[index % categories.length],
        instructor: instructor.name,
        instructorId: instructor.id,
        level: ["Beginner", "Intermediate", "Advanced"][index % 3],
        price: [0, 29, 49, 79, 99][index % 5],
        students: 50 + index * 37,
        rating: 4 + (index % 10) / 10,
        lessons: 12 + index,
        duration: `${4 + index}h ${(index * 7) % 60}m`,
        status: index % 5 === 0 ? "Draft" : "Published",
        thumbnail: `https://picsum.photos/seed/course-${index}/600/400`,
      }),
    );
  }

  const enrollments = [];
  for (let index = 0; index < 25; index += 1) {
    const student = students[index % students.length];
    const course = courses[index % courses.length];
    enrollments.push(
      await Enrollment.create({
        studentId: student.id,
        courseId: course.id,
        amount: course.price,
        paidAmount: course.price,
        paymentMethod: course.price === 0 ? "Not applicable" : "Card",
        status: course.price === 0 ? "Free" : "Paid",
        progress: (index * 13) % 100,
        createdAt: new Date(2026, 6, 1 + (index % 15)),
      }),
    );
  }

  for (let index = 0; index < 10; index += 1) {
    const course = courses[index];
    await Assignment.create({
      title: `Assignment ${index + 1}: ${["Build a Landing Page", "REST API Design", "Data Cleaning", "Wireframe Task", "Campaign Plan"][index % 5]}`,
      courseId: course.id,
      course: course.title,
      dueDate: new Date(2026, 6, 20 + index),
      status: ["Pending", "Submitted", "Graded", "Late"][index % 4],
      grade: index % 4 === 2 ? 70 + index : undefined,
      submissions: 20 + index * 7,
    });
    await Quiz.create({
      title: `Quiz: ${course.title}`,
      courseId: course.id,
      course: course.title,
      questions: 10 + index,
      duration: `${15 + index * 2} min`,
      attempts: 30 + index * 11,
      avgScore: 60 + index * 3,
    });
  }

  for (let index = 0; index < 6; index += 1) {
    const course = courses[index];
    const student = students[index];
    await Certificate.create({
      certificateId: `CERT-2026${1000 + index}`,
      courseId: course.id,
      studentId: student.id,
      course: course.title,
      student: student.name,
      instructor: course.instructor,
      courseDuration: course.duration,
      skills: course.outcomes?.slice(0, 5) ?? [],
      marksObtained: 72 + index * 4,
      maxMarks: 100,
      remarks:
        "Demonstrated consistent effort and successful mastery of the course outcomes.",
      issued: new Date(2026, index, 10 + index),
    });
    await Discussion.create({
      title: [
        "How to structure large applications?",
        "Best practice for API authentication?",
        "Which chart library do you recommend?",
        "Help with async error handling",
        "Design system starter pack?",
        "How much math for ML?",
      ][index],
      authorId: student.id,
      courseId: course.id,
      replies: 3 + index * 4,
      likes: 5 + index * 7,
      answered: index % 3 === 0,
    });
  }

  await Announcement.insertMany([
    {
      title: "Platform Maintenance",
      body: "Scheduled downtime Sunday 2AM UTC for infrastructure upgrades.",
      type: "info",
    },
    {
      title: "New AI Course Bundle",
      body: "Explore our brand new AI and LLM engineering learning path.",
      type: "success",
    },
    {
      title: "Certificate Update",
      body: "Certificates now include verified IDs.",
      type: "info",
    },
  ]);
  await Notification.insertMany([
    {
      userId: demoStudent.id,
      title: "New assignment due",
      body: "Build a Landing Page is due soon",
      unread: true,
    },
    {
      userId: demoStudent.id,
      title: "Quiz result available",
      body: "Your latest quiz result is available",
      unread: true,
    },
    {
      title: "New course announcement",
      body: "An instructor posted an update",
      unread: false,
    },
  ]);

  await ensureLearningContent();

  console.log("Demo LMS data seeded");
}
