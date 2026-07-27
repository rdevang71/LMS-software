export type Lesson = {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  videoAvailable?: boolean;
  videoPublicId?: string;
  duration: string;
  content: string;
  order: number;
};

export type CoursePlayerData = {
  course: {
    id: string;
    title: string;
    description: string;
    instructor: string;
    category: string;
    level: string;
    duration: string;
    lessons: number;
    students: number;
    rating: number;
    thumbnail: string;
    outcomes: string[];
    courseContent: Lesson[];
    resources: {
      _id: string;
      title: string;
      url: string;
      type: string;
      publicId?: string;
      resourceType?: string;
    }[];
  };
  progress: number;
  completedLessons: string[];
  canManage: boolean;
  canAccessContent: boolean;
  isEnrolled: boolean;
  requiresAdminEnrollment: boolean;
  instructorProfile: {
    name: string;
    avatar: string;
    bio: string;
    expertise: string;
    rating: number;
  };
};

export type QuizQuestion = {
  _id: string;
  question: string;
  options: string[];
  correctAnswer?: number;
  explanation?: string;
  points: number;
};

export type QuizRunnerData = {
  quiz: {
    id: string;
    title: string;
    course: string;
    duration: string;
    questionItems: QuizQuestion[];
  };
  canManage: boolean;
};

export type QuizResult = {
  attempt: {
    id: string;
    score: number;
    correct: number;
    total: number;
    results: {
      questionId: string;
      answer: number;
      correctAnswer: number;
      isCorrect: boolean;
      explanation: string;
    }[];
  };
};

export type QuizAttempt = {
  _id: string;
  studentId: { _id: string; name: string; email: string; avatar?: string };
  score: number;
  correct: number;
  total: number;
  createdAt: string;
};

export type Submission = {
  _id: string;
  studentId: string | { _id: string; name: string; email: string; avatar?: string };
  content: string;
  attachmentUrl?: string;
  attachmentPublicId?: string;
  attachmentResourceType?: string;
  status: "Submitted" | "Graded" | "Returned";
  grade?: number;
  feedback?: string;
  submittedAt: string;
};

export type AssignmentWorkspaceData = {
  assignment: {
    id: string;
    title: string;
    course: string;
    courseId: string;
    description: string;
    dueDate: string;
    maxScore: number;
  };
  submissions: Submission[];
  canManage: boolean;
};
