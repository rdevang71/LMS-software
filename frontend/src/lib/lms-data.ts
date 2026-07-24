import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  instructorId: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  price: number;
  students: number;
  rating: number;
  lessons: number;
  duration: string;
  status: "Published" | "Draft" | "Archived";
  thumbnail: string;
  progress?: number;
  completionRate?: number;
};
export type Student = {
  id: string;
  name: string;
  email: string;
  enrolled: number;
  completed: number;
  joined: string;
  progress: number;
  avatar?: string;
};
export type Instructor = {
  id: string;
  name: string;
  email: string;
  expertise: string;
  courses: number;
  students: number;
  rating: number;
  avatar?: string;
};
export type Enrollment = {
  id: string;
  student: string;
  studentId: string;
  studentAvatar?: string;
  course: string;
  courseId: string;
  date: string;
  amount: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  progress: number;
};
export type Assignment = {
  id: string;
  title: string;
  course: string;
  courseId: string;
  audience: "All course students" | "Selected students";
  assignedStudentIds: string[];
  dueDate: string;
  status: "Pending" | "Submitted" | "Graded" | "Returned" | "Late";
  grade?: number;
  submissions: number;
  description: string;
  maxScore: number;
};
export type Quiz = {
  id: string;
  title: string;
  course: string;
  courseId: string;
  questions: number;
  duration: string;
  attempts: number;
  avgScore: number;
  myScore?: number;
};
export type Certificate = {
  id: string;
  mongoId: string;
  courseId?: string;
  studentId?: string;
  course: string;
  student: string;
  issued: string;
  instructor: string;
  courseDuration: string;
  skills: string[];
  marksObtained?: number;
  maxMarks: number;
  percentage?: number | null;
  grade: string;
  badge: string;
  remarks: string;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
  type: "info" | "success" | "warning";
  authorId?: string;
};
export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};
export type Discussion = {
  id: string;
  title: string;
  body?: string;
  author: { id: string; name: string; avatar?: string };
  course: string;
  courseId: string;
  replies: number;
  likes: number;
  answered: boolean;
  time: string;
};

export type LmsData = {
  categories: string[];
  categoryRecords: { id: string; name: string }[];
  courses: Course[];
  myCourses: Course[];
  students: Student[];
  instructors: Instructor[];
  enrollments: Enrollment[];
  assignments: Assignment[];
  quizzes: Quiz[];
  certificates: Certificate[];
  announcements: Announcement[];
  notifications: Notification[];
  discussions: Discussion[];
  recentSubmissions: {
    id: string;
    student: string;
    studentAvatar?: string;
    assignment: string;
    course: string;
    status: "Submitted" | "Graded" | "Returned";
    grade?: number;
    submittedAt: string;
  }[];
  revenueData: { month: string; revenue: number; students: number }[];
  enrollmentData: { day: string; enrollments: number }[];
  categoryDistribution: { name: string; value: number }[];
  stats: {
    totalStudents: number;
    totalCourses: number;
    activeInstructors: number;
    revenue: number;
    completionRate: number;
    growth: number;
    pendingSubmissions: number;
  };
};

const emptyData: LmsData = {
  categories: [],
  categoryRecords: [],
  courses: [],
  myCourses: [],
  students: [],
  instructors: [],
  enrollments: [],
  assignments: [],
  quizzes: [],
  certificates: [],
  announcements: [],
  notifications: [],
  discussions: [],
  recentSubmissions: [],
  revenueData: [],
  enrollmentData: [],
  categoryDistribution: [],
  stats: {
    totalStudents: 0,
    totalCourses: 0,
    activeInstructors: 0,
    revenue: 0,
    completionRate: 0,
    growth: 0,
    pendingSubmissions: 0,
  },
};

export function useLmsData(options?: { refetchInterval?: number }) {
  const query = useQuery({
    queryKey: ["lms-data"],
    queryFn: () => apiRequest<LmsData>("/data"),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval,
  });
  return { ...query, data: query.data ?? emptyData };
}
